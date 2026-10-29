import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Decimal } from '@prisma/client/runtime/library';
import { OrderStatus, Role, DeliveryType, NotificationType } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  asyncHandler,
  NotFoundError,
  ForbiddenError,
  BusinessRuleError,
  ValidationError,
} from '../utils/errors';
import {
  validateTransition,
  validateCancellation,
  getAvailableTransitions,
  canCancel,
} from '../utils/stateMachine';
import { generateOrderCode } from '../utils/orderCode';
import { publishEvent } from '../events/publisher';

const router = Router();

// ─── POST /api/orders ─────────────────────────────────────────────────────────

router.post(
  '/',
  authenticate,
  [
    body('deliveryType')
      .isIn([DeliveryType.RECOJO, DeliveryType.DELIVERY])
      .withMessage('Tipo de entrega inválido'),
    body('notes').optional().isString().trim().isLength({ max: 500 }),
    body('items').isArray({ min: 1 }).withMessage('El pedido debe tener al menos un producto'),
    body('items.*.productId').isUUID().withMessage('ID de producto inválido'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser al menos 1'),
    body('customerId').optional().isUUID(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const {
      deliveryType,
      notes,
      items,
      customerId,
    } = req.body as {
      deliveryType: DeliveryType;
      notes?: string;
      items: { productId: string; quantity: number }[];
      customerId?: string;
    };

    // El cliente solo puede crear pedidos para sí mismo
    const effectiveCustomerId =
      user.role === Role.CLIENTE ? user.id : (customerId ?? user.id);

    // Obtener productos y verificar disponibilidad (el servidor valida precios)
    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== productIds.length) {
      throw new ValidationError('Uno o más productos no existen');
    }

    const unavailable = products.filter((p) => !p.available);
    if (unavailable.length > 0) {
      throw new BusinessRuleError(
        `Productos no disponibles: ${unavailable.map((p) => p.name).join(', ')}`
      );
    }

    // Calcular totales usando Decimal para evitar errores de punto flotante
    const itemsData = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      const unitPrice = product.price;
      const lineTotal = new Decimal(unitPrice).mul(item.quantity);
      return {
        productId: item.productId,
        productNameSnapshot: product.name,
        quantity: item.quantity,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = itemsData.reduce(
      (acc, i) => acc.add(i.lineTotal),
      new Decimal(0)
    );
    const total = subtotal; // Sin impuestos adicionales en esta versión

    // Crear pedido con historial inicial en una transacción
    const order = await prisma.$transaction(async (tx) => {
      const orderCode = await generateOrderCode(tx);

      const newOrder = await tx.order.create({
        data: {
          orderCode,
          customerId: effectiveCustomerId,
          createdById: user.id,
          deliveryType,
          status: OrderStatus.RECIBIDO,
          subtotal,
          total,
          notes,
          items: {
            create: itemsData,
          },
          statusHistory: {
            create: {
              previousStatus: null,
              newStatus: OrderStatus.RECIBIDO,
              changedById: user.id,
              notes: 'Pedido creado',
            },
          },
        },
        include: {
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
          customer: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          statusHistory: true,
        },
      });

      // Guardar evento en outbox para publicación confiable
      await tx.outboxEvent.create({
        data: {
          eventType: 'PedidoCreado',
          payload: {
            orderId: newOrder.id,
            orderCode: newOrder.orderCode,
            customerId: effectiveCustomerId,
            total: total.toString(),
            deliveryType,
            createdAt: newOrder.createdAt.toISOString(),
          },
        },
      });

      return newOrder;
    });

    // Publicar evento (intentar; si falla, el outbox garantiza reintento)
    publishEvent('PedidoCreado', {
      orderId: order.id,
      orderCode: order.orderCode,
      customerId: effectiveCustomerId,
      total: total.toString(),
      deliveryType,
      createdAt: order.createdAt.toISOString(),
    }).catch(() => { /* El outbox se encargará */ });

    res.status(201).json({ success: true, data: order });
  })
);

// ─── GET /api/orders ──────────────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  [
    query('status').optional().isIn(Object.values(OrderStatus)),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('date').optional().isISO8601(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { status, page = 1, limit = 20, date } = req.query as {
      status?: OrderStatus;
      page?: number;
      limit?: number;
      date?: string;
    };

    // Los clientes solo ven sus propios pedidos
    const customerFilter =
      user.role === Role.CLIENTE ? { customerId: user.id } : {};

    const dateFilter = date
      ? {
          createdAt: {
            gte: new Date(`${date}T00:00:00`),
            lte: new Date(`${date}T23:59:59`),
          },
        }
      : {};

    const where = {
      ...customerFilter,
      ...(status && { status }),
      ...dateFilter,
    };

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, email: true } },
          createdBy: { select: { id: true, name: true } },
          items: { include: { product: { select: { name: true, imageUrl: true } } } },
          _count: { select: { items: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// ─── GET /api/orders/code/:code ───────────────────────────────────────────────

router.get(
  '/code/:code',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const order = await prisma.order.findUnique({
      where: { orderCode: req.params.code.toUpperCase() },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) throw new NotFoundError('Pedido');

    // Los clientes solo pueden ver sus propios pedidos
    if (user.role === Role.CLIENTE && order.customerId !== user.id) {
      throw new ForbiddenError();
    }

    res.json({
      success: true,
      data: {
        ...order,
        availableTransitions: getAvailableTransitions(order.status, user.role),
        canCancel: canCancel(order.status),
      },
    });
  })
);

// ─── GET /api/orders/:id ──────────────────────────────────────────────────────

router.get(
  '/:id',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        createdBy: { select: { id: true, name: true } },
        items: { include: { product: { select: { name: true, imageUrl: true } } } },
        statusHistory: {
          include: { changedBy: { select: { id: true, name: true, role: true } } },
          orderBy: { changedAt: 'asc' },
        },
      },
    });

    if (!order) throw new NotFoundError('Pedido');
    if (user.role === Role.CLIENTE && order.customerId !== user.id) {
      throw new ForbiddenError();
    }

    res.json({
      success: true,
      data: {
        ...order,
        availableTransitions: getAvailableTransitions(order.status, user.role),
        canCancel: canCancel(order.status),
      },
    });
  })
);

// ─── PATCH /api/orders/:id/status ────────────────────────────────────────────

router.patch(
  '/:id/status',
  authenticate,
  authorize(Role.ADMIN, Role.ATENCION, Role.COCINA),
  [
    param('id').isUUID(),
    body('status').isIn(Object.values(OrderStatus)).withMessage('Estado inválido'),
    body('notes').optional().isString().trim().isLength({ max: 500 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { status: newStatus, notes } = req.body as { status: OrderStatus; notes?: string };

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
    });
    if (!order) throw new NotFoundError('Pedido');

    // Validar transición en el servidor
    validateTransition(order.status, newStatus, user.role);

    const updated = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: req.params.id },
        data: { status: newStatus },
        include: {
          customer: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { name: true } } } },
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: req.params.id,
          previousStatus: order.status,
          newStatus,
          changedById: user.id,
          notes,
        },
      });

      // Notificación al cliente
      await tx.notification.create({
        data: {
          userId: order.customerId,
          orderId: order.id,
          type: statusToNotificationType(newStatus),
          title: `Pedido ${order.orderCode}`,
          message: statusToMessage(newStatus, order.orderCode),
        },
      });

      // Outbox para el evento de cambio de estado
      const eventType = statusToEventType(newStatus);
      await tx.outboxEvent.create({
        data: {
          eventType,
          payload: {
            orderId: order.id,
            orderCode: order.orderCode,
            previousStatus: order.status,
            newStatus,
            changedBy: user.id,
            changedAt: new Date().toISOString(),
          },
        },
      });

      return updatedOrder;
    });

    // Publicar evento
    publishEvent(statusToEventType(newStatus), {
      orderId: order.id,
      orderCode: order.orderCode,
      previousStatus: order.status,
      newStatus,
      changedBy: user.id,
      changedAt: new Date().toISOString(),
    }).catch(() => {});

    res.json({
      success: true,
      data: {
        ...updated,
        availableTransitions: getAvailableTransitions(newStatus, user.role),
        canCancel: canCancel(newStatus),
      },
    });
  })
);

// ─── POST /api/orders/:id/cancel ─────────────────────────────────────────────

router.post(
  '/:id/cancel',
  authenticate,
  [
    param('id').isUUID(),
    body('reason').optional().isString().trim().isLength({ max: 500 }),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const { reason } = req.body as { reason?: string };

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new NotFoundError('Pedido');

    // Los clientes solo cancelan sus propios pedidos
    if (user.role === Role.CLIENTE && order.customerId !== user.id) {
      throw new ForbiddenError();
    }

    validateCancellation(order.status, user.role);

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: req.params.id },
        data: { status: OrderStatus.CANCELADO },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: req.params.id,
          previousStatus: order.status,
          newStatus: OrderStatus.CANCELADO,
          changedById: user.id,
          notes: reason ?? 'Pedido cancelado',
        },
      });

      await tx.notification.create({
        data: {
          userId: order.customerId,
          orderId: order.id,
          type: NotificationType.PEDIDO_CANCELADO,
          title: `Pedido ${order.orderCode} cancelado`,
          message: reason ?? 'Tu pedido ha sido cancelado.',
        },
      });

      await tx.outboxEvent.create({
        data: {
          eventType: 'PedidoCancelado',
          payload: {
            orderId: order.id,
            orderCode: order.orderCode,
            reason,
            cancelledBy: user.id,
            cancelledAt: new Date().toISOString(),
          },
        },
      });
    });

    publishEvent('PedidoCancelado', {
      orderId: order.id,
      orderCode: order.orderCode,
      reason,
      cancelledBy: user.id,
    }).catch(() => {});

    res.json({ success: true, message: 'Pedido cancelado correctamente' });
  })
);

// ─── GET /api/orders/:id/history ─────────────────────────────────────────────

router.get(
  '/:id/history',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) throw new NotFoundError('Pedido');

    if (user.role === Role.CLIENTE && order.customerId !== user.id) {
      throw new ForbiddenError();
    }

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: req.params.id },
      include: { changedBy: { select: { id: true, name: true, role: true } } },
      orderBy: { changedAt: 'asc' },
    });

    res.json({ success: true, data: history });
  })
);

// ─── Helpers de estado ────────────────────────────────────────────────────────

function statusToNotificationType(status: OrderStatus): NotificationType {
  const map: Partial<Record<OrderStatus, NotificationType>> = {
    [OrderStatus.CONFIRMADO]:  NotificationType.PEDIDO_CONFIRMADO,
    [OrderStatus.PREPARANDO]:  NotificationType.PEDIDO_EN_PREPARACION,
    [OrderStatus.LISTO]:       NotificationType.PEDIDO_LISTO,
    [OrderStatus.EN_CAMINO]:   NotificationType.PEDIDO_EN_CAMINO,
    [OrderStatus.ENTREGADO]:   NotificationType.PEDIDO_ENTREGADO,
    [OrderStatus.CANCELADO]:   NotificationType.PEDIDO_CANCELADO,
  };
  return map[status] ?? NotificationType.SISTEMA;
}

function statusToMessage(status: OrderStatus, code: string): string {
  const map: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.CONFIRMADO]:  `Tu pedido ${code} fue confirmado.`,
    [OrderStatus.PREPARANDO]:  `Tu pedido ${code} está siendo preparado.`,
    [OrderStatus.LISTO]:       `Tu pedido ${code} está listo.`,
    [OrderStatus.EN_CAMINO]:   `Tu pedido ${code} está en camino.`,
    [OrderStatus.ENTREGADO]:   `Tu pedido ${code} fue entregado. ¡Buen provecho!`,
    [OrderStatus.CANCELADO]:   `Tu pedido ${code} fue cancelado.`,
  };
  return map[status] ?? `El estado de tu pedido ${code} cambió.`;
}

function statusToEventType(status: OrderStatus): string {
  const map: Partial<Record<OrderStatus, string>> = {
    [OrderStatus.CONFIRMADO]:  'PedidoConfirmado',
    [OrderStatus.PREPARANDO]:  'PedidoEnPreparacion',
    [OrderStatus.LISTO]:       'PedidoListo',
    [OrderStatus.EN_CAMINO]:   'PedidoEnCamino',
    [OrderStatus.ENTREGADO]:   'PedidoEntregado',
    [OrderStatus.CANCELADO]:   'PedidoCancelado',
  };
  return map[status] ?? 'PedidoActualizado';
}

export default router;


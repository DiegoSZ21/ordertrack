/**
 * Pruebas del servicio de pedidos
 * Ejecutar con: npm test
 */

import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/database';
import bcrypt from 'bcryptjs';
import { Role, OrderStatus, DeliveryType } from '@prisma/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let adminToken: string;
let atencionToken: string;
let cocinaToken: string;
let clienteToken: string;
let clienteId: string;
let atencionId: string;

let categoryId: string;
let productId: string;
let orderId: string;
let orderCode: string;

async function createUser(
  email: string,
  password: string,
  role: Role,
  name: string
): Promise<string> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing.id;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { email, name, passwordHash, role },
  });
  return user.id;
}

async function getToken(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  return res.body.data?.token ?? '';
}

// ─── Setup y teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Crear usuarios de prueba
  await createUser('test.admin@ordertrack.pe', 'Admin123!', Role.ADMIN, 'Admin Test');
  atencionId = await createUser('test.atencion@ordertrack.pe', 'Atencion123!', Role.ATENCION, 'Atencion Test');
  await createUser('test.cocina@ordertrack.pe', 'Cocina123!', Role.COCINA, 'Cocina Test');
  clienteId = await createUser('test.cliente@ordertrack.pe', 'Cliente123!', Role.CLIENTE, 'Cliente Test');

  // Obtener tokens
  adminToken = await getToken('test.admin@ordertrack.pe', 'Admin123!');
  atencionToken = await getToken('test.atencion@ordertrack.pe', 'Atencion123!');
  cocinaToken = await getToken('test.cocina@ordertrack.pe', 'Cocina123!');
  clienteToken = await getToken('test.cliente@ordertrack.pe', 'Cliente123!');

  // Crear categoría y producto de prueba
  const category = await prisma.category.create({
    data: { name: 'Test Category ' + Date.now(), description: 'Para pruebas' },
  });
  categoryId = category.id;

  const product = await prisma.product.create({
    data: {
      categoryId,
      name: 'Producto Test',
      price: '25.00',
      available: true,
    },
  });
  productId = product.id;
});

afterAll(async () => {
  // Limpiar datos de prueba
  await prisma.notification.deleteMany({
    where: { order: { orderCode: { startsWith: 'ORD-TEST' } } },
  });
  await prisma.orderStatusHistory.deleteMany({
    where: { order: { orderCode: { startsWith: 'ORD-TEST' } } },
  });
  await prisma.orderItem.deleteMany({
    where: { order: { orderCode: { startsWith: 'ORD-TEST' } } },
  });
  await prisma.order.deleteMany({ where: { orderCode: { startsWith: 'ORD-TEST' } } });
  await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  await prisma.category.delete({ where: { id: categoryId } }).catch(() => {});
  await prisma.user.deleteMany({
    where: { email: { contains: 'test.' } },
  });
  await prisma.$disconnect();
});

// ─── Tests de autenticación ───────────────────────────────────────────────────

describe('Autenticación', () => {
  test('POST /api/auth/login — credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.admin@ordertrack.pe', password: 'Admin123!' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
    expect(res.body.data.user.role).toBe('ADMIN');
    // No debe exponer el hash de contraseña
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('POST /api/auth/login — contraseña incorrecta', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test.admin@ordertrack.pe', password: 'WrongPassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login — email no registrado', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexiste@ordertrack.pe', password: 'Admin123!' });

    expect(res.status).toBe(401);
  });

  test('POST /api/auth/login — email inválido', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-es-email', password: 'Admin123!' });

    expect(res.status).toBe(400);
  });

  test('GET /api/auth/me — con token válido', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test.admin@ordertrack.pe');
  });

  test('GET /api/auth/me — sin token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Tests de productos ───────────────────────────────────────────────────────

describe('Productos', () => {
  test('GET /api/products — acceso público', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/products — solo ADMIN puede crear', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        categoryId,
        name: 'Producto Admin Test',
        price: '15.50',
        available: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Producto Admin Test');

    // Limpiar
    await prisma.product.delete({ where: { id: res.body.data.id } }).catch(() => {});
  });

  test('POST /api/products — CLIENTE no puede crear', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ categoryId, name: 'Hack', price: '1.00' });

    expect(res.status).toBe(403);
  });

  test('POST /api/products — precio inválido rechazado', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ categoryId, name: 'Test', price: 'no-es-precio' });

    expect(res.status).toBe(400);
  });
});

// ─── Tests de pedidos ─────────────────────────────────────────────────────────

describe('Pedidos — Creación', () => {
  test('POST /api/orders — cliente crea pedido válido', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        deliveryType: DeliveryType.RECOJO,
        items: [{ productId, quantity: 2 }],
        notes: 'Sin sal',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(OrderStatus.RECIBIDO);
    expect(res.body.data.items).toHaveLength(1);
    // Verificar que el total fue calculado en el servidor (2 × S/25.00 = S/50.00)
    expect(res.body.data.total).toBe('50.00');

    orderId = res.body.data.id;
    orderCode = res.body.data.orderCode;

    // Forzar código de prueba para limpieza
    await prisma.order.update({
      where: { id: orderId },
      data: { orderCode: 'ORD-TEST-001' },
    });
    orderCode = 'ORD-TEST-001';
  });

  test('POST /api/orders — sin autenticación', async () => {
    const res = await request(app)
      .post('/api/orders')
      .send({ deliveryType: 'RECOJO', items: [{ productId, quantity: 1 }] });

    expect(res.status).toBe(401);
  });

  test('POST /api/orders — sin items', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ deliveryType: 'RECOJO', items: [] });

    expect(res.status).toBe(400);
  });

  test('POST /api/orders — cantidad negativa rechazada', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ deliveryType: 'RECOJO', items: [{ productId, quantity: -1 }] });

    expect(res.status).toBe(400);
  });

  test('POST /api/orders — producto inexistente', async () => {
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({
        deliveryType: 'RECOJO',
        items: [{ productId: '00000000-0000-0000-0000-000000000000', quantity: 1 }],
      });

    expect([400, 404, 422]).toContain(res.status);
  });
});

describe('Pedidos — Acceso', () => {
  test('GET /api/orders — cliente solo ve sus pedidos', async () => {
    const res = await request(app)
      .get('/api/orders')
      .set('Authorization', `Bearer ${clienteToken}`);

    expect(res.status).toBe(200);
    const orders: { customerId: string }[] = res.body.data;
    orders.forEach((order) => {
      expect(order.customerId).toBe(clienteId);
    });
  });

  test('GET /api/orders/:id — cliente accede a su pedido', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${clienteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(orderId);
  });

  test('GET /api/orders/:id — cliente NO puede ver pedido ajeno', async () => {
    // Crear pedido de otro usuario
    const anotherOrder = await prisma.order.create({
      data: {
        orderCode: 'ORD-TEST-002',
        customerId: atencionId,
        createdById: atencionId,
        deliveryType: DeliveryType.RECOJO,
        status: OrderStatus.RECIBIDO,
        subtotal: '10.00',
        total: '10.00',
        items: {
          create: [{
            productId,
            productNameSnapshot: 'Test',
            quantity: 1,
            unitPrice: '10.00',
            lineTotal: '10.00',
          }],
        },
        statusHistory: {
          create: {
            newStatus: OrderStatus.RECIBIDO,
            changedById: atencionId,
          },
        },
      },
    });

    const res = await request(app)
      .get(`/api/orders/${anotherOrder.id}`)
      .set('Authorization', `Bearer ${clienteToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Pedidos — Transiciones de estado', () => {
  test('PATCH /api/orders/:id/status — ATENCION confirma pedido', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${atencionToken}`)
      .send({ status: OrderStatus.CONFIRMADO });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(OrderStatus.CONFIRMADO);
  });

  test('PATCH /api/orders/:id/status — COCINA inicia preparación', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${cocinaToken}`)
      .send({ status: OrderStatus.PREPARANDO });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(OrderStatus.PREPARANDO);
  });

  test('PATCH /api/orders/:id/status — transición inválida rechazada', async () => {
    // Intentar saltar de PREPARANDO a ENTREGADO directamente
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${atencionToken}`)
      .send({ status: OrderStatus.ENTREGADO });

    expect(res.status).toBe(422);
  });

  test('PATCH /api/orders/:id/status — CLIENTE no puede cambiar estado', async () => {
    const res = await request(app)
      .patch(`/api/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${clienteToken}`)
      .send({ status: OrderStatus.CONFIRMADO });

    expect(res.status).toBe(403);
  });

  test('GET /api/orders/:id/history — historial registrado correctamente', async () => {
    const res = await request(app)
      .get(`/api/orders/${orderId}/history`)
      .set('Authorization', `Bearer ${clienteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/orders/:id/cancel — no se puede cancelar en PREPARANDO', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${atencionToken}`)
      .send({ reason: 'Test' });

    expect(res.status).toBe(422);
  });
});


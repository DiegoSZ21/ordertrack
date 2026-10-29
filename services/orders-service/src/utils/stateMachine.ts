import { OrderStatus, Role } from '@prisma/client';
import { ForbiddenError, BusinessRuleError } from '../utils/errors';

// ─── Máquina de estados de pedidos ───────────────────────────────────────────

type Transition = {
  from: OrderStatus;
  to: OrderStatus;
  allowedRoles: Role[];
};

const TRANSITIONS: Transition[] = [
  // Confirmación: solo ATENCION o ADMIN
  { from: OrderStatus.RECIBIDO,    to: OrderStatus.CONFIRMADO,  allowedRoles: [Role.ATENCION, Role.ADMIN] },
  // Inicio de preparación: solo COCINA o ADMIN
  { from: OrderStatus.CONFIRMADO,  to: OrderStatus.PREPARANDO,  allowedRoles: [Role.COCINA, Role.ADMIN] },
  // Pedido listo: solo COCINA o ADMIN
  { from: OrderStatus.PREPARANDO,  to: OrderStatus.LISTO,       allowedRoles: [Role.COCINA, Role.ADMIN] },
  // Delivery: LISTO → EN_CAMINO → ENTREGADO
  { from: OrderStatus.LISTO,       to: OrderStatus.EN_CAMINO,   allowedRoles: [Role.ATENCION, Role.ADMIN] },
  { from: OrderStatus.EN_CAMINO,   to: OrderStatus.ENTREGADO,   allowedRoles: [Role.ATENCION, Role.ADMIN] },
  // Recojo: LISTO → ENTREGADO directamente
  { from: OrderStatus.LISTO,       to: OrderStatus.ENTREGADO,   allowedRoles: [Role.ATENCION, Role.ADMIN] },
];

// Estados en los que se puede cancelar
const CANCELABLE_STATUSES: OrderStatus[] = [
  OrderStatus.RECIBIDO,
  OrderStatus.CONFIRMADO,
];

export function validateTransition(
  currentStatus: OrderStatus,
  newStatus: OrderStatus,
  userRole: Role
): void {
  const transition = TRANSITIONS.find(
    (t) => t.from === currentStatus && t.to === newStatus
  );

  if (!transition) {
    throw new BusinessRuleError(
      `Transición de estado inválida: ${currentStatus} → ${newStatus}`
    );
  }

  if (!transition.allowedRoles.includes(userRole)) {
    throw new ForbiddenError(
      `Tu rol no permite la transición ${currentStatus} → ${newStatus}`
    );
  }
}

export function validateCancellation(currentStatus: OrderStatus, userRole: Role): void {
  if (!CANCELABLE_STATUSES.includes(currentStatus)) {
    throw new BusinessRuleError(
      `No se puede cancelar un pedido en estado ${currentStatus}`
    );
  }
  if (userRole === Role.CLIENTE) {
    // Los clientes solo pueden cancelar pedidos en RECIBIDO
    if (currentStatus !== OrderStatus.RECIBIDO) {
      throw new ForbiddenError('Solo puedes cancelar pedidos que aún no han sido confirmados');
    }
  }
}

export function getAvailableTransitions(
  currentStatus: OrderStatus,
  userRole: Role
): OrderStatus[] {
  return TRANSITIONS
    .filter((t) => t.from === currentStatus && t.allowedRoles.includes(userRole))
    .map((t) => t.to);
}

export function canCancel(status: OrderStatus): boolean {
  return CANCELABLE_STATUSES.includes(status);
}


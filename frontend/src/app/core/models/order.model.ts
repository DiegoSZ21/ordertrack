export type OrderStatus =
  | 'RECIBIDO'
  | 'CONFIRMADO'
  | 'PREPARANDO'
  | 'LISTO'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'CANCELADO';

export type DeliveryType = 'RECOJO' | 'DELIVERY';

export interface OrderItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  product?: {
    name: string;
    imageUrl?: string;
  };
}

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus;
  changedById: string;
  changedAt: string;
  notes?: string;
  changedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

export interface Order {
  id: string;
  orderCode: string;
  customerId: string;
  createdById: string;
  deliveryType: DeliveryType;
  status: OrderStatus;
  subtotal: string;
  total: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  createdBy?: {
    id: string;
    name: string;
  };
  items: OrderItem[];
  statusHistory?: OrderStatusHistory[];
  availableTransitions?: OrderStatus[];
  canCancel?: boolean;
}

export interface CreateOrderDto {
  deliveryType: DeliveryType;
  notes?: string;
  items: { productId: string; quantity: number }[];
  customerId?: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  RECIBIDO:   'Recibido',
  CONFIRMADO: 'Confirmado',
  PREPARANDO: 'En preparación',
  LISTO:      'Listo',
  EN_CAMINO:  'En camino',
  ENTREGADO:  'Entregado',
  CANCELADO:  'Cancelado',
};

export const ORDER_STATUS_ICONS: Record<OrderStatus, string> = {
  RECIBIDO:   'inbox',
  CONFIRMADO: 'check_circle',
  PREPARANDO: 'soup_kitchen',
  LISTO:      'done_all',
  EN_CAMINO:  'local_shipping',
  ENTREGADO:  'verified',
  CANCELADO:  'cancel',
};


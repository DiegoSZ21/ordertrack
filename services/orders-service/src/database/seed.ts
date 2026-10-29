/**
 * Seed de datos de demostración para OrderTrack
 * Ejecutar con: npm run seed
 *
 * Idempotente: verifica antes de crear para evitar duplicados.
 */

import { PrismaClient, Role, OrderStatus, DeliveryType, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const prisma = new PrismaClient();

async function main(): Promise<void> {
  console.log('🌱 Iniciando seed de datos de demostración...\n');

  // ─── Usuarios ────────────────────────────────────────────────────────────────

  const SALT_ROUNDS = 10;

  const users = [
    {
      email: 'admin@ordertrack.pe',
      name: 'Administrador',
      password: 'Admin123!',
      role: Role.ADMIN,
    },
    {
      email: 'cocina@ordertrack.pe',
      name: 'Chef Carlos',
      password: 'Cocina123!',
      role: Role.COCINA,
    },
    {
      email: 'atencion@ordertrack.pe',
      name: 'Ana García',
      password: 'Atencion123!',
      role: Role.ATENCION,
    },
    {
      email: 'cliente1@ordertrack.pe',
      name: 'María López',
      password: 'Cliente123!',
      role: Role.CLIENTE,
    },
    {
      email: 'cliente2@ordertrack.pe',
      name: 'Juan Pérez',
      password: 'Cliente123!',
      role: Role.CLIENTE,
    },
  ];

  const createdUsers: Record<string, { id: string; role: Role }> = {};

  for (const u of users) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);
      const created = await prisma.user.create({
        data: { email: u.email, name: u.name, passwordHash, role: u.role },
      });
      createdUsers[u.email] = { id: created.id, role: created.role };
      console.log(`  ✅ Usuario creado: ${u.email} (${u.role})`);
    } else {
      createdUsers[u.email] = { id: existing.id, role: existing.role };
      console.log(`  ⏩ Usuario ya existe: ${u.email}`);
    }
  }

  // ─── Categorías ──────────────────────────────────────────────────────────────

  const categories = [
    { name: 'Entradas', description: 'Platos de entrada y aperitivos', sortOrder: 1 },
    { name: 'Sopas y Caldos', description: 'Sopas tradicionales peruanas', sortOrder: 2 },
    { name: 'Platos de fondo', description: 'Platos principales', sortOrder: 3 },
    { name: 'Pastas y Arroces', description: 'Pastas y arroces especiales', sortOrder: 4 },
    { name: 'Parrillas', description: 'Carnes y parrillas a la brasa', sortOrder: 5 },
    { name: 'Postres', description: 'Postres y dulces peruanos', sortOrder: 6 },
    { name: 'Bebidas', description: 'Bebidas frías y calientes', sortOrder: 7 },
  ];

  const createdCategories: Record<string, string> = {};

  for (const cat of categories) {
    const existing = await prisma.category.findUnique({ where: { name: cat.name } });
    if (!existing) {
      const created = await prisma.category.create({ data: cat });
      createdCategories[cat.name] = created.id;
      console.log(`  ✅ Categoría creada: ${cat.name}`);
    } else {
      createdCategories[cat.name] = existing.id;
      console.log(`  ⏩ Categoría ya existe: ${cat.name}`);
    }
  }

  // ─── Productos ───────────────────────────────────────────────────────────────

  const products = [
    // Entradas
    {
      category: 'Entradas',
      name: 'Causa limeña rellena',
      description: 'Papa amarilla condimentada con ají amarillo, rellena de atún y mayonesa',
      price: '18.00',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    },
    {
      category: 'Entradas',
      name: 'Ceviche mixto',
      description: 'Pescado fresco, mariscos, ají amarillo, limón y choclo. El clásico peruano',
      price: '32.00',
      imageUrl: 'https://images.unsplash.com/photo-1603400521630-9f2de124b33b?w=400',
    },
    {
      category: 'Entradas',
      name: 'Anticuchos de corazón',
      description: 'Corazón de res marinado en ají panca, servido con papa y choclo',
      price: '22.00',
      imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28be1ec70?w=400',
    },
    // Sopas
    {
      category: 'Sopas y Caldos',
      name: 'Caldo de gallina',
      description: 'Caldo reconfortante con gallina de corral, fideos y hierbabuena',
      price: '20.00',
      imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    },
    {
      category: 'Sopas y Caldos',
      name: 'Sopa a la minuta',
      description: 'Sopa criolla con carne molida, fideos cabello de ángel y leche',
      price: '18.00',
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    },
    // Platos de fondo
    {
      category: 'Platos de fondo',
      name: 'Lomo saltado',
      description: 'Tiras de lomo fino salteadas con tomate, cebolla y ají amarillo. Servido con arroz y papas fritas',
      price: '38.00',
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
    },
    {
      category: 'Platos de fondo',
      name: 'Ají de gallina',
      description: 'Gallina desmenuzada en salsa cremosa de ají amarillo con pecanas y aceitunas',
      price: '28.00',
      imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28be1ec70?w=400',
    },
    {
      category: 'Platos de fondo',
      name: 'Seco de cordero',
      description: 'Cordero guisado en salsa de cilantro con frejoles y yuca',
      price: '35.00',
      imageUrl: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    },
    {
      category: 'Platos de fondo',
      name: 'Pescado a lo macho',
      description: 'Filete de pescado frito bañado en salsa mariscos con ají amarillo',
      price: '42.00',
      imageUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400',
    },
    // Pastas y arroces
    {
      category: 'Pastas y Arroces',
      name: 'Arroz con leche',
      description: 'Arroz cremoso cocinado con leche evaporada y canela',
      price: '12.00',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    },
    {
      category: 'Pastas y Arroces',
      name: 'Tallarines verdes',
      description: 'Tallarines con salsa de albahaca, queso fresco y nueces al estilo peruano',
      price: '25.00',
      imageUrl: 'https://images.unsplash.com/photo-1574894709920-11b28be1ec70?w=400',
    },
    // Parrillas
    {
      category: 'Parrillas',
      name: 'Parrilla mixta',
      description: 'Selección de carnes: pollo, chorizo, costillas y lomo. Con ensalada y papas',
      price: '65.00',
      imageUrl: 'https://images.unsplash.com/photo-1544025162-d76538808c0f?w=400',
    },
    {
      category: 'Parrillas',
      name: 'Pollo a la brasa (1/4)',
      description: 'Pollo crispy marinado con especias secretas. Con ensalada y papas fritas',
      price: '22.00',
      imageUrl: 'https://images.unsplash.com/photo-1527477396000-e27163b481c2?w=400',
    },
    // Postres
    {
      category: 'Postres',
      name: 'Suspiro limeño',
      description: 'Manjar blanco cubierto con merengue italiano y canela molida',
      price: '14.00',
      imageUrl: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=400',
    },
    {
      category: 'Postres',
      name: 'Mazamorra morada',
      description: 'Postre tradicional de maíz morado con frutas secas y canela',
      price: '10.00',
      imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400',
    },
    // Bebidas
    {
      category: 'Bebidas',
      name: 'Chicha morada',
      description: 'Bebida natural de maíz morado, piña, membrillo y especias',
      price: '8.00',
      imageUrl: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400',
    },
    {
      category: 'Bebidas',
      name: 'Inca Kola',
      description: 'La bebida de sabor nacional. 400ml',
      price: '6.00',
      imageUrl: 'https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=400',
    },
    {
      category: 'Bebidas',
      name: 'Agua mineral',
      description: 'Agua mineral sin gas o con gas 600ml',
      price: '5.00',
      imageUrl: 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400',
    },
  ];

  const createdProducts: Record<string, string> = {};

  for (const prod of products) {
    const existing = await prisma.product.findFirst({
      where: { name: prod.name, categoryId: createdCategories[prod.category] },
    });
    if (!existing) {
      const created = await prisma.product.create({
        data: {
          categoryId: createdCategories[prod.category],
          name: prod.name,
          description: prod.description,
          price: prod.price,
          imageUrl: prod.imageUrl,
          available: true,
        },
      });
      createdProducts[prod.name] = created.id;
      console.log(`  ✅ Producto creado: ${prod.name}`);
    } else {
      createdProducts[prod.name] = existing.id;
      console.log(`  ⏩ Producto ya existe: ${prod.name}`);
    }
  }

  // ─── Pedidos de ejemplo ───────────────────────────────────────────────────────

  const adminId = createdUsers['admin@ordertrack.pe'].id;
  const atencionId = createdUsers['atencion@ordertrack.pe'].id;
  const cliente1Id = createdUsers['cliente1@ordertrack.pe'].id;
  const cliente2Id = createdUsers['cliente2@ordertrack.pe'].id;

  const sampleOrders = [
    {
      orderCode: 'ORD-0001',
      customerId: cliente1Id,
      createdById: atencionId,
      deliveryType: DeliveryType.RECOJO,
      status: OrderStatus.ENTREGADO,
      notes: 'Sin ají por favor',
      items: [
        { productName: 'Lomo saltado', qty: 1 },
        { productName: 'Chicha morada', qty: 2 },
      ],
    },
    {
      orderCode: 'ORD-0002',
      customerId: cliente2Id,
      createdById: cliente2Id,
      deliveryType: DeliveryType.DELIVERY,
      status: OrderStatus.PREPARANDO,
      notes: 'Entregar en recepción',
      items: [
        { productName: 'Ceviche mixto', qty: 2 },
        { productName: 'Causa limeña rellena', qty: 1 },
        { productName: 'Inca Kola', qty: 2 },
      ],
    },
    {
      orderCode: 'ORD-0003',
      customerId: cliente1Id,
      createdById: atencionId,
      deliveryType: DeliveryType.RECOJO,
      status: OrderStatus.LISTO,
      notes: null,
      items: [
        { productName: 'Ají de gallina', qty: 1 },
        { productName: 'Suspiro limeño', qty: 1 },
        { productName: 'Chicha morada', qty: 1 },
      ],
    },
    {
      orderCode: 'ORD-0004',
      customerId: cliente2Id,
      createdById: cliente2Id,
      deliveryType: DeliveryType.RECOJO,
      status: OrderStatus.RECIBIDO,
      notes: null,
      items: [
        { productName: 'Pollo a la brasa (1/4)', qty: 2 },
        { productName: 'Agua mineral', qty: 2 },
      ],
    },
    {
      orderCode: 'ORD-0005',
      customerId: cliente1Id,
      createdById: atencionId,
      deliveryType: DeliveryType.DELIVERY,
      status: OrderStatus.CANCELADO,
      notes: 'Pedido duplicado',
      items: [
        { productName: 'Anticuchos de corazón', qty: 2 },
      ],
    },
  ];

  for (const orderData of sampleOrders) {
    const existing = await prisma.order.findUnique({
      where: { orderCode: orderData.orderCode },
    });

    if (existing) {
      console.log(`  ⏩ Pedido ya existe: ${orderData.orderCode}`);
      continue;
    }

    // Calcular totales
    let subtotal = 0;
    const itemsWithPrice: Array<{
      productId: string;
      productNameSnapshot: string;
      quantity: number;
      unitPrice: string;
      lineTotal: string;
    }> = [];
    for (const item of orderData.items) {
      const product = await prisma.product.findFirst({
        where: { name: item.productName },
      });
      if (!product) continue;
      const lineTotal = Number(product.price) * item.qty;
      subtotal += lineTotal;
      itemsWithPrice.push({
        productId: product.id,
        productNameSnapshot: product.name,
        quantity: item.qty,
        unitPrice: product.price.toString(),
        lineTotal: lineTotal.toFixed(2),
      });
    }

    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderCode: orderData.orderCode,
          customerId: orderData.customerId,
          createdById: orderData.createdById,
          deliveryType: orderData.deliveryType,
          status: orderData.status,
          subtotal: subtotal.toFixed(2),
          total: subtotal.toFixed(2),
          notes: orderData.notes,
          items: { create: itemsWithPrice },
        },
      });

      // Crear historial de estados según el estado final
      const statusFlow = getStatusFlow(orderData.status);
      let prev: OrderStatus | null = null;
      for (const st of statusFlow) {
        await tx.orderStatusHistory.create({
          data: {
            orderId: newOrder.id,
            previousStatus: prev,
            newStatus: st,
            changedById: adminId,
            changedAt: new Date(),
          },
        });
        prev = st;
      }

      return newOrder;
    });

    // Notificación de ejemplo para el cliente
    if (orderData.status === OrderStatus.PREPARANDO || orderData.status === OrderStatus.LISTO) {
      await prisma.notification.create({
        data: {
          userId: orderData.customerId,
          orderId: order.id,
          type: NotificationType.PEDIDO_EN_PREPARACION,
          title: `Pedido ${orderData.orderCode}`,
          message: `Tu pedido está siendo preparado.`,
        },
      });
    }

    console.log(`  ✅ Pedido creado: ${orderData.orderCode} (${orderData.status})`);
  }

  console.log('\n✨ Seed completado exitosamente.\n');
  console.log('Credenciales de demostración (SOLO para entorno local):');
  console.log('  admin@ordertrack.pe     / Admin123!');
  console.log('  cocina@ordertrack.pe    / Cocina123!');
  console.log('  atencion@ordertrack.pe  / Atencion123!');
  console.log('  cliente1@ordertrack.pe  / Cliente123!');
  console.log('  cliente2@ordertrack.pe  / Cliente123!');
}

function getStatusFlow(finalStatus: OrderStatus): OrderStatus[] {
  const full: OrderStatus[] = [
    OrderStatus.RECIBIDO,
    OrderStatus.CONFIRMADO,
    OrderStatus.PREPARANDO,
    OrderStatus.LISTO,
    OrderStatus.ENTREGADO,
  ];
  const cancel = [OrderStatus.RECIBIDO, OrderStatus.CANCELADO];

  if (finalStatus === OrderStatus.CANCELADO) return cancel;

  const idx = full.indexOf(finalStatus);
  return idx >= 0 ? full.slice(0, idx + 1) : [OrderStatus.RECIBIDO];
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import winston from 'winston';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const PORT = parseInt(process.env.REALTIME_SERVICE_PORT ?? '3002', 10);
const JWT_SECRET = process.env.JWT_SECRET ?? '';
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:4200';
const RABBITMQ_URL = process.env.RABBITMQ_URL ?? '';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET no definido');
  process.exit(1);
}

// ─── Logger ────────────────────────────────────────────────────────────────────

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// ─── Express + Socket.IO ──────────────────────────────────────────────────────

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutos
    skipMiddlewares: true,
  },
});

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'realtime-service',
    connections: io.engine.clientsCount,
    timestamp: new Date().toISOString(),
  });
});

// ─── Autenticación de sockets ─────────────────────────────────────────────────

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

io.use((socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token as string | undefined;

  if (!token) {
    return next(new Error('Token de autenticación requerido'));
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: string;
    };
    socket.userId = payload.sub;
    socket.userRole = payload.role;
    next();
  } catch {
    next(new Error('Token inválido o expirado'));
  }
});

// ─── Eventos de Socket.IO ─────────────────────────────────────────────────────

io.on('connection', (socket: AuthenticatedSocket) => {
  logger.info('Cliente conectado', { socketId: socket.id, userId: socket.userId });

  // Unirse a sala personal del usuario
  if (socket.userId) {
    socket.join(`user:${socket.userId}`);
  }

  // Unirse a sala de cocina
  if (socket.userRole === 'COCINA' || socket.userRole === 'ADMIN') {
    socket.join('kitchen');
    logger.info('Usuario unido a sala de cocina', { userId: socket.userId });
  }

  // Unirse a sala de atención
  if (socket.userRole === 'ATENCION' || socket.userRole === 'ADMIN') {
    socket.join('atencion');
  }

  // Suscripción a un pedido específico (solo si el usuario tiene permisos)
  socket.on('subscribe:order', (data: { orderId: string }) => {
    if (!data?.orderId || typeof data.orderId !== 'string') return;

    // Nota: la validación de propiedad del pedido se hace en el orders-service.
    // El cliente solo se suscribe; los eventos de cambio los emite el servidor.
    socket.join(`order:${data.orderId}`);
    logger.debug('Socket suscrito a pedido', { socketId: socket.id, orderId: data.orderId });
  });

  socket.on('unsubscribe:order', (data: { orderId: string }) => {
    if (!data?.orderId) return;
    socket.leave(`order:${data.orderId}`);
  });

  socket.on('disconnect', (reason) => {
    logger.info('Cliente desconectado', { socketId: socket.id, reason });
  });
});

// ─── Consumidor de RabbitMQ ───────────────────────────────────────────────────

async function startRabbitMQConsumer(): Promise<void> {
  if (!RABBITMQ_URL) {
    logger.warn('RABBITMQ_URL no configurado. El realtime-service opera sin mensajería.');
    return;
  }

  try {
    const amqp = await import('amqplib');
    const conn = await amqp.connect(RABBITMQ_URL);
    const channel = await conn.createChannel();

    const events = [
      'PedidoCreado',
      'PedidoConfirmado',
      'PedidoEnPreparacion',
      'PedidoListo',
      'PedidoEntregado',
      'PedidoCancelado',
    ];

    for (const eventType of events) {
      await channel.assertExchange(eventType, 'fanout', { durable: true });
      const q = await channel.assertQueue(`realtime.${eventType}`, { durable: true });
      await channel.bindQueue(q.queue, eventType, '');

      channel.consume(q.queue, (msg) => {
        if (!msg) return;

        try {
          const event = JSON.parse(msg.content.toString()) as {
            eventType: string;
            payload: {
              orderId: string;
              orderCode: string;
              customerId?: string;
              newStatus?: string;
              previousStatus?: string;
              [key: string]: unknown;
            };
          };

          const { orderId, customerId, newStatus } = event.payload;

          // Emitir a la sala del pedido
          io.to(`order:${orderId}`).emit('order:statusChanged', event.payload);

          // Emitir a la sala de cocina para pedidos nuevos y confirmados
          if (eventType === 'PedidoCreado' || eventType === 'PedidoConfirmado') {
            io.to('kitchen').emit('order:created', event.payload);
            io.to('atencion').emit('order:created', event.payload);
          }

          // Notificación al cliente propietario
          if (customerId) {
            io.to(`user:${customerId}`).emit('notification:created', {
              type: eventType,
              orderId,
              message: statusToMessage(newStatus ?? eventType),
              timestamp: new Date().toISOString(),
            });
          }

          channel.ack(msg);
        } catch (err) {
          logger.error('Error procesando mensaje RabbitMQ', { err });
          channel.nack(msg, false, false); // descartar mensaje inválido
        }
      });
    }

    logger.info('✅ Consumidor de RabbitMQ iniciado');
  } catch (err) {
    logger.warn('No se pudo conectar a RabbitMQ (reintentando en 10s):', err);
    setTimeout(() => startRabbitMQConsumer(), 10000);
  }
}

function statusToMessage(status: string): string {
  const map: Record<string, string> = {
    PedidoCreado: 'Tu pedido fue recibido.',
    PedidoConfirmado: 'Tu pedido fue confirmado.',
    PedidoEnPreparacion: 'Tu pedido está en preparación.',
    PedidoListo: '¡Tu pedido está listo!',
    PedidoEntregado: 'Tu pedido fue entregado. ¡Buen provecho!',
    PedidoCancelado: 'Tu pedido fue cancelado.',
    CONFIRMADO: 'Tu pedido fue confirmado.',
    PREPARANDO: 'Tu pedido está en preparación.',
    LISTO: '¡Tu pedido está listo!',
    EN_CAMINO: 'Tu pedido está en camino.',
    ENTREGADO: 'Tu pedido fue entregado.',
    CANCELADO: 'Tu pedido fue cancelado.',
  };
  return map[status] ?? 'El estado de tu pedido fue actualizado.';
}

// ─── Función para emitir eventos desde otros servicios (HTTP) ─────────────────
// Endpoint interno para que el orders-service pueda emitir eventos directamente

app.use(express.json());

app.post('/internal/emit', (req, res) => {
  const { event, room, data } = req.body as {
    event: string;
    room: string;
    data: unknown;
  };

  if (!event || !room) {
    res.status(400).json({ error: 'event y room son requeridos' });
    return;
  }

  io.to(room).emit(event, data);
  res.json({ ok: true });
});

// ─── Inicio ───────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  logger.info(`🔌 realtime-service escuchando en http://localhost:${PORT}`);
});

startRabbitMQConsumer();


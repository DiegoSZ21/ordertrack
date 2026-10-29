import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './utils/errors';
import { logger } from './utils/logger';
import { initPublisher } from './events/publisher';

// Rutas
import authRoutes from './routes/auth.routes';
import productRoutes from './routes/products.routes';
import orderRoutes from './routes/orders.routes';
import notificationRoutes from './routes/notifications.routes';
import reportRoutes from './routes/reports.routes';

const app = express();

// ─── Seguridad y middleware ───────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin: true, // Permite conexiones desde localhost, celulares y tablets en la red local
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

if (config.env !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// Rate limiting general
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde' },
});
app.use('/api', limiter);

// Rate limiting estricto para login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de inicio de sesión' },
});
app.use('/api/auth/login', loginLimiter);

// ─── Rutas ────────────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'orders-service', timestamp: new Date().toISOString() });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Ruta no encontrada' });
});

// ─── Manejo centralizado de errores ──────────────────────────────────────────

app.use(errorHandler);

// ─── Inicio del servidor ──────────────────────────────────────────────────────

async function main(): Promise<void> {
  await connectDatabase();
  await initPublisher();

  const server = app.listen(config.port, () => {
    logger.info(`🚀 orders-service escuchando en http://localhost:${config.port}`);
    logger.info(`📝 Entorno: ${config.env}`);
  });

  // Apagado ordenado
  const shutdown = async (): Promise<void> => {
    logger.info('Iniciando apagado ordenado...');
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.error('Error fatal al iniciar el servicio:', err);
  process.exit(1);
});

export { app };


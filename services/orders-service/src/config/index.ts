import dotenv from 'dotenv';
import path from 'path';

// Cargar .env desde la raíz del servicio
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? process.env.ORDERS_SERVICE_PORT ?? '3001', 10),

  database: {
    url: process.env.DATABASE_URL ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? '',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  cors: {
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200',
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? '',
    enabled: Boolean(process.env.RABBITMQ_URL),
  },

  realtimeService: {
    url: process.env.REALTIME_SERVICE_URL ?? 'http://localhost:3002',
  },
};

// Validar configuración mínima obligatoria
const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Variable de entorno obligatoria no definida: ${varName}`);
    process.exit(1);
  }
}


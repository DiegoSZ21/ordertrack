import { logger } from '../utils/logger';

// Publicador de eventos: publica a RabbitMQ si está disponible,
// o registra localmente para el outbox processor.

let channel: import('amqplib').Channel | null = null;

export async function initPublisher(): Promise<void> {
  const { config } = await import('../config');
  if (!config.rabbitmq.enabled) {
    logger.info('📨 RabbitMQ no configurado. Los eventos se usarán solo via outbox.');
    return;
  }

  try {
    const amqp = await import('amqplib');
    const conn = await amqp.connect(config.rabbitmq.url);
    channel = await conn.createChannel();

    const exchanges = [
      'PedidoCreado', 'PedidoConfirmado', 'PedidoEnPreparacion',
      'PedidoListo', 'PedidoEntregado', 'PedidoCancelado', 'PedidoActualizado',
    ];

    for (const exchange of exchanges) {
      await channel.assertExchange(exchange, 'fanout', { durable: true });
    }

    logger.info('✅ Conexión a RabbitMQ establecida');
  } catch (err) {
    logger.warn('⚠️  No se pudo conectar a RabbitMQ:', err);
    channel = null;
  }
}

export async function publishEvent(
  eventType: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!channel) return;

  try {
    const message = JSON.stringify({
      eventId: crypto.randomUUID(),
      eventType,
      timestamp: new Date().toISOString(),
      payload,
    });

    channel.publish(eventType, '', Buffer.from(message), {
      persistent: true,
      contentType: 'application/json',
    });
  } catch (err) {
    logger.error('Error publicando evento:', err);
  }
}


import { prisma } from '../config/database';
import type { PrismaClient } from '@prisma/client';

/**
 * Genera un código de pedido único y secuencial con formato ORD-XXXX.
 * Se ejecuta dentro de una transacción para evitar colisiones.
 */
export async function generateOrderCode(
  tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
): Promise<string> {
  // Contar pedidos existentes para generar el siguiente número
  const count = await tx.order.count();
  const nextNum = count + 1;
  const code = `ORD-${String(nextNum).padStart(4, '0')}`;

  // Verificar unicidad (en caso de concurrencia extrema)
  const existing = await tx.order.findUnique({ where: { orderCode: code } });
  if (existing) {
    // Usar timestamp como fallback
    return `ORD-${Date.now().toString().slice(-6)}`;
  }

  return code;
}


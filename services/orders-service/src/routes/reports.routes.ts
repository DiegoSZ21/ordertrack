import { Router } from 'express';
import { query } from 'express-validator';
import { Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/errors';

const router = Router();

// Todos los endpoints de reportes requieren ADMIN

// ─── GET /api/reports/summary ─────────────────────────────────────────────────

router.get(
  '/summary',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const [
      totalToday,
      pendingOrders,
      completedToday,
      cancelledToday,
      salesToday,
    ] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.order.count({
        where: {
          status: { in: ['RECIBIDO', 'CONFIRMADO', 'PREPARANDO', 'LISTO', 'EN_CAMINO'] },
        },
      }),
      prisma.order.count({
        where: { status: 'ENTREGADO', createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.order.count({
        where: { status: 'CANCELADO', createdAt: { gte: startOfDay, lt: endOfDay } },
      }),
      prisma.order.aggregate({
        where: {
          status: 'ENTREGADO',
          createdAt: { gte: startOfDay, lt: endOfDay },
        },
        _sum: { total: true },
      }),
    ]);

    // Tiempo promedio de preparación (RECIBIDO → ENTREGADO)
    const avgPrepTimeResult = await prisma.$queryRaw<{ avg_minutes: number | null }[]>`
      SELECT AVG(
        EXTRACT(EPOCH FROM (
          h2."changed_at" - h1."changed_at"
        )) / 60
      ) as avg_minutes
      FROM order_status_history h1
      JOIN order_status_history h2 ON h1.order_id = h2.order_id
      WHERE h1.new_status = 'RECIBIDO'
        AND h2.new_status = 'ENTREGADO'
        AND h1."changed_at" >= ${startOfDay}
    `;

    const avgMinutes = avgPrepTimeResult[0]?.avg_minutes ?? null;

    res.json({
      success: true,
      data: {
        totalToday,
        pendingOrders,
        completedToday,
        cancelledToday,
        salesToday: salesToday._sum.total?.toString() ?? '0.00',
        avgPreparationMinutes: avgMinutes !== null ? Math.round(Number(avgMinutes)) : null,
      },
    });
  })
);

// ─── GET /api/reports/sales ───────────────────────────────────────────────────

router.get(
  '/sales',
  authenticate,
  authorize(Role.ADMIN),
  [
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
    query('groupBy').optional().isIn(['day', 'week', 'month']),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { from, to, groupBy = 'day' } = req.query as {
      from?: string;
      to?: string;
      groupBy?: string;
    };

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const sales = await prisma.$queryRaw<
      { period: string; total_sales: string; order_count: string }[]
    >`
      SELECT
        DATE_TRUNC(${groupBy}, created_at)::date::text AS period,
        COALESCE(SUM(total), 0)::text AS total_sales,
        COUNT(*)::text AS order_count
      FROM orders
      WHERE status = 'ENTREGADO'
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      GROUP BY DATE_TRUNC(${groupBy}, created_at)
      ORDER BY period ASC
    `;

    res.json({ success: true, data: sales });
  })
);

// ─── GET /api/reports/top-products ───────────────────────────────────────────

router.get(
  '/top-products',
  authenticate,
  authorize(Role.ADMIN),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).toInt(),
    query('from').optional().isISO8601(),
    query('to').optional().isISO8601(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { limit = 10, from, to } = req.query as {
      limit?: number;
      from?: string;
      to?: string;
    };

    const fromDate = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const toDate = to ? new Date(to) : new Date();

    const results = await prisma.$queryRaw<
      { product_name: string; total_quantity: string; total_revenue: string }[]
    >`
      SELECT
        oi.product_name_snapshot AS product_name,
        SUM(oi.quantity)::text AS total_quantity,
        SUM(oi.line_total)::text AS total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status = 'ENTREGADO'
        AND o.created_at >= ${fromDate}
        AND o.created_at <= ${toDate}
      GROUP BY oi.product_name_snapshot
      ORDER BY SUM(oi.quantity) DESC
      LIMIT ${limit}
    `;

    res.json({ success: true, data: results });
  })
);

// ─── GET /api/reports/preparation-times ──────────────────────────────────────

router.get(
  '/preparation-times',
  authenticate,
  authorize(Role.ADMIN),
  asyncHandler(async (_req, res) => {
    const results = await prisma.$queryRaw<
      { order_code: string; minutes: number }[]
    >`
      SELECT
        o.order_code,
        ROUND(
          EXTRACT(EPOCH FROM (h2.changed_at - h1.changed_at)) / 60
        )::int AS minutes
      FROM orders o
      JOIN order_status_history h1 ON h1.order_id = o.id AND h1.new_status = 'RECIBIDO'
      JOIN order_status_history h2 ON h2.order_id = o.id AND h2.new_status = 'ENTREGADO'
      WHERE o.created_at >= NOW() - INTERVAL '7 days'
      ORDER BY minutes DESC
      LIMIT 50
    `;

    res.json({ success: true, data: results });
  })
);

export default router;


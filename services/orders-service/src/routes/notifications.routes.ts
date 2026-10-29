import { Router } from 'express';
import { param } from 'express-validator';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { asyncHandler, NotFoundError } from '../utils/errors';

const router = Router();

// ─── GET /api/notifications ───────────────────────────────────────────────────

router.get(
  '/',
  authenticate,
  asyncHandler(async (req, res) => {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { order: { select: { orderCode: true } } },
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user!.id, readAt: null },
    });

    res.json({ success: true, data: notifications, unreadCount });
  })
);

// ─── PATCH /api/notifications/:id/read ───────────────────────────────────────

router.patch(
  '/:id/read',
  authenticate,
  [param('id').isUUID()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notification) throw new NotFoundError('Notificación');
    if (notification.userId !== req.user!.id) {
      const { ForbiddenError } = await import('../utils/errors');
      throw new ForbiddenError();
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { readAt: new Date() },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── PATCH /api/notifications/read-all ───────────────────────────────────────

router.patch(
  '/read-all',
  authenticate,
  asyncHandler(async (req, res) => {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  })
);

export default router;


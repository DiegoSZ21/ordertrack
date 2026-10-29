import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { Role } from '@prisma/client';
import { prisma } from '../config/database';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { asyncHandler, NotFoundError, ForbiddenError } from '../utils/errors';

const router = Router();

// ─── GET /api/products ────────────────────────────────────────────────────────
// Público (el menú es visible para todos)

router.get(
  '/',
  [
    query('categoryId').optional().isUUID().withMessage('categoryId debe ser UUID'),
    query('available').optional().isBoolean(),
    query('search').optional().isString().trim(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const {
      categoryId,
      available,
      search,
      page = 1,
      limit = 50,
    } = req.query as {
      categoryId?: string;
      available?: string;
      search?: string;
      page?: number;
      limit?: number;
    };

    const where = {
      ...(categoryId && { categoryId }),
      ...(available !== undefined && { available: available === 'true' }),
      ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: { category: { select: { id: true, name: true } } },
        orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  })
);

// ─── GET /api/products/categories ─────────────────────────────────────────────

router.get(
  '/categories',
  asyncHandler(async (_req, res) => {
    const categories = await prisma.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: categories });
  })
);

// ─── GET /api/products/:id ────────────────────────────────────────────────────

router.get(
  '/:id',
  [param('id').isUUID()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { category: { select: { id: true, name: true } } },
    });
    if (!product) throw new NotFoundError('Producto');
    res.json({ success: true, data: product });
  })
);

// ─── POST /api/products ───────────────────────────────────────────────────────
// Solo ADMIN

router.post(
  '/',
  authenticate,
  authorize(Role.ADMIN),
  [
    body('categoryId').isUUID().withMessage('categoryId inválido'),
    body('name').isString().trim().isLength({ min: 2, max: 200 }),
    body('description').optional().isString().trim().isLength({ max: 1000 }),
    body('imageUrl').optional().isURL(),
    body('price').isDecimal({ decimal_digits: '0,2' }).withMessage('Precio inválido'),
    body('available').optional().isBoolean(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { categoryId, name, description, imageUrl, price, available = true } = req.body as {
      categoryId: string;
      name: string;
      description?: string;
      imageUrl?: string;
      price: string;
      available?: boolean;
    };

    const product = await prisma.product.create({
      data: { categoryId, name, description, imageUrl, price, available },
      include: { category: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, data: product });
  })
);

// ─── PATCH /api/products/:id ──────────────────────────────────────────────────
// Solo ADMIN

router.patch(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  [
    param('id').isUUID(),
    body('name').optional().isString().trim().isLength({ min: 2, max: 200 }),
    body('description').optional().isString().trim(),
    body('imageUrl').optional().isURL(),
    body('price').optional().isDecimal({ decimal_digits: '0,2' }),
    body('available').optional().isBoolean(),
    body('categoryId').optional().isUUID(),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Producto');

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body,
      include: { category: { select: { id: true, name: true } } },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── DELETE /api/products/:id (desactivar) ────────────────────────────────────
// Solo ADMIN

router.delete(
  '/:id',
  authenticate,
  authorize(Role.ADMIN),
  [param('id').isUUID()],
  validateRequest,
  asyncHandler(async (req, res) => {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) throw new NotFoundError('Producto');

    await prisma.product.update({
      where: { id: req.params.id },
      data: { available: false },
    });

    res.json({ success: true, message: 'Producto desactivado correctamente' });
  })
);

export default router;


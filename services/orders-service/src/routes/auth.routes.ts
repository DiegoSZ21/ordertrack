import { Router } from 'express';
import { body } from 'express-validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { config } from '../config';
import { validateRequest } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, UnauthorizedError, NotFoundError } from '../utils/errors';

const router = Router();

// ─── POST /api/auth/login ─────────────────────────────────────────────────────

router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Correo electrónico inválido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('Contraseña requerida (mínimo 6 caracteres)'),
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as { email: string; password: string };

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true, active: true, passwordHash: true },
    });

    if (!user || !user.active) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Credenciales incorrectas');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const token = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });
    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
    });

    res.json({
      success: true,
      data: {
        token,
        refreshToken,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      },
    });
  })
);

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) throw new UnauthorizedError('Refresh token requerido');

    let payload: { sub: string; email: string; role: string };
    try {
      payload = jwt.verify(refreshToken, config.jwt.refreshSecret) as typeof payload;
    } catch {
      throw new UnauthorizedError('Refresh token inválido o expirado');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, active: true },
    });

    if (!user || !user.active) throw new UnauthorizedError('Usuario no disponible');

    const newPayload = { sub: user.id, email: user.email, role: user.role };
    const token = jwt.sign(newPayload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
    });

    res.json({ success: true, data: { token } });
  })
);

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    if (!user) throw new NotFoundError('Usuario');
    res.json({ success: true, data: user });
  })
);

export default router;


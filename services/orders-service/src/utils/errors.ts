import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// ─── Clase base de error de aplicación ───────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this);
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string>[];
  constructor(message: string, errors: Record<string, string>[] = []) {
    super(message, 400);
    this.errors = errors;
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'No autenticado') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Sin permisos para realizar esta acción') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}

// ─── Middleware de manejo de errores ─────────────────────────────────────────

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error('Error no operacional', { error: err.message, stack: err.stack });
    }

    const body: Record<string, unknown> = {
      success: false,
      message: err.message,
      statusCode: err.statusCode,
    };

    if (err instanceof ValidationError && err.errors.length > 0) {
      body.errors = err.errors;
    }

    res.status(err.statusCode).json(body);
    return;
  }

  // Error no esperado — no revelar detalles en producción
  logger.error('Error inesperado', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    statusCode: 500,
  });
}

// ─── Wrapper para controladores async ────────────────────────────────────────

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}


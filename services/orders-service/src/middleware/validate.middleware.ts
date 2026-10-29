import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/errors';

export function validateRequest(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((err) => ({
      field: (err as { path?: string }).path ?? 'unknown',
      message: err.msg as string,
    }));
    return next(new ValidationError('Error de validación', formatted));
  }
  next();
}


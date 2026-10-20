import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      const isZod = err instanceof ZodError || (err as any)?.name === 'ZodError';
      if (isZod) {
        const errors = (err as any).errors || [];
        res.status(400).json({
          error: 'Validation failed',
          details: errors.map((e: any) => ({
            field: Array.isArray(e.path) ? e.path.join('.') : '',
            message: e.message
          }))
        });
        return;
      }
      next(err);
    }
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      const isZod = err instanceof ZodError || (err as any)?.name === 'ZodError';
      if (isZod) {
        const errors = (err as any).errors || [];
        res.status(400).json({
          error: 'Validation failed for query parameters',
          details: errors.map((e: any) => ({
            field: Array.isArray(e.path) ? e.path.join('.') : '',
            message: e.message
          }))
        });
        return;
      }
      next(err);
    }
  };
}

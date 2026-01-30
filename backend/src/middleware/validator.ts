import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { error } from '../utils/response';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        error(res, 'VALIDATION_ERROR', 'Invalid input data', 400, err.errors);
      } else {
        error(res, 'VALIDATION_ERROR', 'Invalid input data', 400);
      }
    }
  };
}

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export const validateData = (schema: z.ZodSchema) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: (error as any).errors.map((err: any) => ({
          path: err.path.join('.'),
          message: err.message
        }))
      });
    }
    return res.status(500).json({ message: 'Internal server error during validation' });
  }
};

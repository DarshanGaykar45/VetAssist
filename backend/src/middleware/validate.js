import { z } from 'zod';

/**
 * Validate incoming request body, query, or params with a Zod schema
 * @param {z.ZodSchema} schema
 */
export function validateRequest(schema) {
  return async (req, res, next) => {
    try {
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      req.validated = validated;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.errors.map(err => ({
          field: err.path.join('.').replace(/^(body|query|params)\.?/, ''),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          message: 'Validation failed. Please check the submitted fields.',
          errors: issues,
        });
      }
      next(error);
    }
  };
}

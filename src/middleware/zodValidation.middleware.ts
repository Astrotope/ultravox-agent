import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { ApiResponseUtil } from '../utils/apiResponse';

/**
 * Validation target enum
 */
export enum ValidationTarget {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
  HEADERS = 'headers'
}

/**
 * Validation options
 */
export interface ValidationOptions {
  target: ValidationTarget;
  schema: ZodSchema;
  stripUnknown?: boolean;
}

/**
 * Create Zod validation middleware
 */
export function validateSchema(options: ValidationOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { target, schema, stripUnknown = true } = options;
      
      // Get the data to validate based on target
      const dataToValidate = req[target];
      
      // Parse and validate with Zod
      const parseOptions = stripUnknown ? { errorMap: customErrorMap } : { 
        errorMap: customErrorMap,
        stripUnknown: false 
      };
      
      const validatedData = schema.parse(dataToValidate, parseOptions);
      
      // Replace the original data with validated/transformed data
      (req as any)[target] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        ApiResponseUtil.validationError(res, formattedErrors);
        return;
      }
      
      console.error('Validation middleware error:', error);
      ApiResponseUtil.error(res, 'Validation error occurred', 500);
    }
  };
}

/**
 * Validate request body
 */
export function validateBody(schema: ZodSchema) {
  return validateSchema({
    target: ValidationTarget.BODY,
    schema
  });
}

/**
 * Validate query parameters
 */
export function validateQuery(schema: ZodSchema) {
  return validateSchema({
    target: ValidationTarget.QUERY,
    schema
  });
}

/**
 * Validate route parameters
 */
export function validateParams(schema: ZodSchema) {
  return validateSchema({
    target: ValidationTarget.PARAMS,
    schema
  });
}

/**
 * Validate headers
 */
export function validateHeaders(schema: ZodSchema) {
  return validateSchema({
    target: ValidationTarget.HEADERS,
    schema
  });
}

/**
 * Custom error mapping for better error messages
 */
function customErrorMap(issue: z.ZodIssueOptionalMessage, _ctx: z.ErrorMapCtx): { message: string } {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') {
        return { message: `${issue.path.join('.')} must be a text value` };
      }
      if (issue.expected === 'number') {
        return { message: `${issue.path.join('.')} must be a number` };
      }
      return { message: `${issue.path.join('.')} has invalid type: expected ${issue.expected}, got ${issue.received}` };
      
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: `${issue.path.join('.')} must be at least ${issue.minimum} characters` };
      }
      if (issue.type === 'number') {
        return { message: `${issue.path.join('.')} must be at least ${issue.minimum}` };
      }
      return { message: `${issue.path.join('.')} is too small` };
      
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `${issue.path.join('.')} must be at most ${issue.maximum} characters` };
      }
      if (issue.type === 'number') {
        return { message: `${issue.path.join('.')} must be at most ${issue.maximum}` };
      }
      return { message: `${issue.path.join('.')} is too large` };
      
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'email') {
        return { message: `${issue.path.join('.')} must be a valid email address` };
      }
      if (issue.validation === 'url') {
        return { message: `${issue.path.join('.')} must be a valid URL` };
      }
      if (issue.validation === 'regex') {
        return { message: `${issue.path.join('.')} has invalid format` };
      }
      return { message: `${issue.path.join('.')} has invalid format` };
      
    case z.ZodIssueCode.invalid_enum_value:
      return { 
        message: `${issue.path.join('.')} must be one of: ${issue.options.join(', ')}` 
      };
      
    case z.ZodIssueCode.invalid_date:
      return { message: `${issue.path.join('.')} must be a valid date` };
      
    default:
      return { message: issue.message || `${issue.path.join('.')} is invalid` };
  }
}

/**
 * Format Zod errors for API response
 */
function formatZodErrors(error: ZodError): Array<{
  field: string;
  message: string;
  code: string;
  value?: any;
}> {
  return error.errors.map(issue => ({
    field: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
    value: issue.path.length > 0 ? getNestedValue(error.issues[0], issue.path) : undefined
  }));
}

/**
 * Get nested value from object path
 */
function getNestedValue(obj: any, path: (string | number)[]): any {
  return path.reduce((current, key) => current?.[key], obj);
}

/**
 * Async validation wrapper for database checks
 */
export function validateWithAsync<T>(
  schema: ZodSchema<T>,
  asyncValidator?: (data: T) => Promise<void>
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // First run Zod validation
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      
      // Then run async validation if provided
      if (asyncValidator) {
        await asyncValidator(validatedData);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error);
        ApiResponseUtil.validationError(res, formattedErrors);
        return;
      }
      
      // Handle custom async validation errors
      if (error instanceof Error) {
        ApiResponseUtil.error(res, error.message, 400);
        return;
      }
      
      console.error('Async validation error:', error);
      ApiResponseUtil.error(res, 'Validation error occurred', 500);
    }
  };
}
import { Request, Response, NextFunction } from 'express';

// Recursively clean string fields from potentially dangerous script tags or javascript: URIs
function sanitizeValue(val: any): any {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onload\s*=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const cleaned: Record<string, any> = {};
    for (const key of Object.keys(val)) {
      cleaned[key] = sanitizeValue(val[key]);
    }
    return cleaned;
  }
  return val;
}

export function sanitizeInputs(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
}

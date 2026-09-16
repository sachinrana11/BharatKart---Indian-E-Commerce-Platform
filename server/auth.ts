import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { User, UserRole } from '../src/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'bharatkart_prod_jwt_super_secure_secret_2026_key';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const usersCol = db.collection('users');
    const user = await usersCol.findOne({ _id: decoded._id });

    if (user) {
      req.user = {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role as UserRole,
        isEmailVerified: user.isEmailVerified,
        avatar: user.avatar,
        createdAt: user.createdAt,
      };
    }
    next();
  } catch (err) {
    // Invalid token, continue unauthenticated
    next();
  }
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }
  next();
}

export function requireRoles(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: 'Access denied. Insufficient administrator privileges.' });
    }
    next();
  };
}

export async function logAudit(req: AuthenticatedRequest, action: string, entity: string, entityId: string, details: string) {
  try {
    const auditCol = db.collection('auditLogs');
    await auditCol.insertOne({
      userId: req.user?._id || 'ANONYMOUS',
      userName: req.user?.name || 'Guest / System',
      action,
      entity,
      entityId,
      details,
      ipAddress: req.ip || req.socket.remoteAddress || '127.0.0.1',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}

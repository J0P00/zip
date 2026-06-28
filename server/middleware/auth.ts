import { NextFunction, Request, Response } from 'express';
import { query } from '../db/pool';
import { verifyToken, JwtUser } from '../utils/auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: JwtUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication token is required.' });
  }

  try {
    const payload = verifyToken(token);
    const result = await query('SELECT id FROM users WHERE id = $1', [payload.id]);

    if (result.rowCount === 0) {
      return res.status(401).json({ success: false, message: 'User session is no longer valid.' });
    }

    req.authUser = payload;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(roles: Array<'student' | 'teacher' | 'admin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    if (!roles.includes(req.authUser.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to access this resource.' });
    }

    next();
  };
}


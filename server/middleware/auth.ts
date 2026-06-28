import { Request, Response, NextFunction } from 'express';
import { mockVerifySessionToken } from '../mock-db';
import { SessionData } from '../types';

declare global {
  namespace Express {
    interface Request {
      user?: SessionData;
      sessionToken?: string;
    }
  }
}

async function resolveSession(sessionToken: string) {
  const result = await mockVerifySessionToken(sessionToken);
  if (result.error || !result.data) {
    return null;
  }

  const { user, session } = result.data;
  if (!user || new Date(session.expires_at) < new Date()) {
    return null;
  }

  return {
    user_id: user.id,
    email: user.email,
    role: user.role,
    timestamp: Date.now()
  } as SessionData;
}

export async function verifySessionToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header'
      });
    }

    const sessionToken = authHeader.substring(7);
    req.sessionToken = sessionToken;

    const user = await resolveSession(sessionToken);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Error in verifySessionToken middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
}

export async function optionalSession(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const sessionToken = authHeader.substring(7);
    req.sessionToken = sessionToken;
    req.user = await resolveSession(sessionToken) || undefined;
    next();
  } catch (error) {
    console.error('Error in optionalSession middleware:', error);
    next();
  }
}

export function requireRole(roles: string | string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions for this action'
      });
    }

    next();
  };
}

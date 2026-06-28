import { Request, Response, NextFunction } from 'express';
import { supabase, isSupabaseConfigured } from '../database';
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

/**
 * Middleware to verify session token and attach user data to request
 */
export async function verifySessionToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Missing or invalid authorization header'
      });
    }

    const sessionToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    req.sessionToken = sessionToken;

    let sessionData: any = null;
    let sessionError: any = null;
    let user: any = null;

    if (isSupabaseConfigured) {
      // Query Supabase
      const result = await supabase
        .from('user_sessions')
        .select('user_id, expires_at')
        .eq('session_token', sessionToken)
        .single();

      sessionData = result.data;
      sessionError = result.error;

      if (!sessionError && sessionData) {
        // Get user data from Supabase
        const userResult = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.user_id)
          .single();
        user = userResult.data;
      }
    } else {
      // Use mock database
      const result = await mockVerifySessionToken(sessionToken);
      if (!result.error && result.data) {
        user = result.data.user;
        sessionData = result.data.session;
      } else {
        sessionError = result.error;
      }
    }

    if (sessionError || !sessionData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session token'
      });
    }

    // Check if session has expired
    if (new Date(sessionData.expires_at) < new Date()) {
      return res.status(401).json({
        success: false,
        message: 'Session has expired'
      });
    }

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', sessionData.user_id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update last activity
    await supabase
      .from('user_sessions')
      .update({ last_activity: new Date().toISOString() })
      .eq('session_token', sessionToken);

    // Attach user data to request
    req.user = {
      user_id: userData.id,
      email: userData.email,
      role: userData.role,
      timestamp: Date.now()
    };

    next();
  } catch (error) {
    console.error('Error in verifySessionToken middleware:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication'
    });
  }
}

/**
 * Optional middleware - doesn't fail if no session, just populates req.user if present
 */
export async function optionalSession(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const sessionToken = authHeader.substring(7);
    req.sessionToken = sessionToken;

    const { data: sessionData, error: sessionError } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', sessionToken)
      .single();

    if (!sessionError && sessionData && new Date(sessionData.expires_at) > new Date()) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', sessionData.user_id)
        .single();

      if (userData) {
        req.user = {
          user_id: userData.id,
          email: userData.email,
          role: userData.role,
          timestamp: Date.now()
        };

        await supabase
          .from('user_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('session_token', sessionToken);
      }
    }

    next();
  } catch (error) {
    console.error('Error in optionalSession middleware:', error);
    next();
  }
}

/**
 * Check if user has specific role
 */
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

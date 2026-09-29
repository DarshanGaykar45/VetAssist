import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

/**
 * Middleware to authenticate JWT access token
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required. Please log in.',
    });
  }

  try {
    const secret = process.env.AUTH_SECRET || 'vetassist_dev_jwt_secret_cattle_clinic_2026_99401';
    const decoded = jwt.verify(token, secret);

    // Verify user still exists and is active in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, isActive: true, phone: true, specialization: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid user session or account has been deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
}

/**
 * Middleware to enforce role-based access control
 * @param {string[]} allowedRoles - Array of allowed role strings e.g. ['ADMIN', 'VET']
 */
export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}

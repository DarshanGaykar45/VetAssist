import rateLimit from 'express-rate-limit';

// Strict rate limiter for authentication endpoints (prevents brute-force password attacks)
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes window
  max: 20, // max 20 attempts per 5 minutes per IP (allows normal dev/testing)
  skipSuccessfulRequests: true, // Successful doctor logins do not consume brute-force quota
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many failed login attempts from this IP. Please try again after 5 minutes.',
  },
});

// General API rate limiter for clinic endpoints
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 requests per 15 minutes (single-user clinic system)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.',
  },
});

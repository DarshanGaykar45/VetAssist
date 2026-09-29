import { Router } from 'express';
import { login, getMe, changePassword, updateCredentials } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRequest } from '../middleware/validate.js';
import { loginSchema, changePasswordSchema, updateCredentialsSchema } from '../validators/schemas.js';

const router = Router();

// Single Doctor Auth - NO public registration route
router.post('/login', authLimiter, validateRequest(loginSchema), login);
router.get('/me', authenticateToken, getMe);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), changePassword);
// PUT /credentials is the canonical RESTful endpoint for updating login email/password
router.put('/credentials', authenticateToken, validateRequest(updateCredentialsSchema), updateCredentials);

export default router;

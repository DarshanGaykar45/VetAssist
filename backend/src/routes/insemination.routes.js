import { Router } from 'express';
import {
  getInseminations,
  getInseminationById,
  createInsemination,
  resendWhatsApp,
  toggleSentStatus,
} from '../controllers/insemination.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { createInseminationSchema } from '../validators/schemas.js';

const router = Router();

// Protect all insemination routes with JWT
router.use(authenticateToken);

router.get('/', getInseminations);
router.get('/:id', getInseminationById);
router.post('/', validateRequest(createInseminationSchema), createInsemination);
router.post('/:id/resend-whatsapp', resendWhatsApp);
router.patch('/:id/toggle-sent', toggleSentStatus);

export default router;

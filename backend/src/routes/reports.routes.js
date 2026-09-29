import { Router } from 'express';
import { getInseminationAnalytics } from '../controllers/reports.controller.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);
router.get('/analytics', getInseminationAnalytics);

export default router;

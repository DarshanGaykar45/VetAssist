import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import { updateSettingsSchema } from '../validators/schemas.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getSettings);
router.put('/', validateRequest(updateSettingsSchema), updateSettings);
// Note: /clinic and /profile sub-routes were removed (dead code - frontend only uses PUT /)

export default router;

import { Router } from 'express';
import {
  getFarmers,
  getFarmerById,
  createFarmer,
  updateFarmer,
  deleteFarmer,
  addCowToFarmer,
  updateCow,
  deleteCow,
} from '../controllers/farmer.controller.js';
import { authenticateToken } from '../middleware/auth.js';
import { validateRequest } from '../middleware/validate.js';
import {
  createFarmerSchema,
  updateFarmerSchema,
  createCowSchema,
  updateCowSchema,
} from '../validators/schemas.js';

const router = Router();

// Protect all farmer routes with JWT auth
router.use(authenticateToken);

// Farmers CRUD
router.get('/', getFarmers);
router.get('/:id', getFarmerById);
router.post('/', validateRequest(createFarmerSchema), createFarmer);
router.put('/:id', validateRequest(updateFarmerSchema), updateFarmer);
router.delete('/:id', deleteFarmer);

// Nested Cows management
router.post('/:id/cows', validateRequest(createCowSchema), addCowToFarmer);
router.put('/:id/cows/:cowId', validateRequest(updateCowSchema), updateCow);
router.delete('/:id/cows/:cowId', deleteCow);

export default router;

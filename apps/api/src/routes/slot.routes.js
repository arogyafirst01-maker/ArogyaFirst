import { Router } from 'express';
import * as controller from '../controllers/slot.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest, createSlotSchema, updateSlotSchema } from '../middleware/validation.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = Router();

// Slot CRUD Routes
router.post('/', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), validateRequest(createSlotSchema), controller.createSlot);

// Public slot viewing for patients browsing (no auth required)
router.get('/', controller.getSlots);

// Availability Routes - keep specific paths before parameterized routes
router.get('/availability', controller.checkAvailability);

router.get('/:id', controller.getSlotById);

router.put('/:id', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), validateRequest(updateSlotSchema), controller.updateSlot);

router.delete('/:id', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), controller.deleteSlot);

// Availability Routes

// Bulk Operations (Optional)
router.post('/bulk', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), controller.bulkCreateSlots);

export default router;
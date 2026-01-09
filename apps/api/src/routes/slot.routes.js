import { Router } from 'express';
import * as slotController from '../controllers/slot.controller.js';
import { authenticate, authenticateOptional } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest, createSlotSchema, updateSlotSchema } from '../middleware/validation.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = Router();

// Slot CRUD Routes
router.post('/', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), validateRequest(createSlotSchema), slotController.createSlot);

// Slot viewing with optional auth - authenticated providers see only their slots, patients/public see available slots
router.get('/', authenticateOptional, slotController.getSlots);

// Availability Routes - keep specific paths before parameterized routes
router.get('/availability', slotController.checkAvailability);

router.get('/:id', slotController.getSlotById);

router.put('/:id', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), validateRequest(updateSlotSchema), slotController.updateSlot);

router.delete('/:id', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), slotController.deleteSlot);

// Availability Routes

// Bulk Operations (Optional)
router.post('/bulk', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), slotController.bulkCreateSlots);

export default router;

const { Router } = require('express');
const slotController = require('../controllers/slot.controller.js');
const { authenticate, authenticateOptional } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, createSlotSchema, updateSlotSchema } = require('../middleware/validation.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

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

module.exports = router;
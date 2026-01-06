const { Router } = require('express');
const slotController = require('../controllers/slot.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, createSlotSchema, updateSlotSchema } = require('../middleware/validation.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = Router();

// Slot CRUD Routes
router.post('/', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), validateRequest(createSlotSchema), slotController.createSlot);

// Public slot viewing for patients browsing (no auth required)
router.get('/', slotController.getSlots);

// Availability Routes - keep specific paths before parameterized routes
router.get('/availability', slotController.checkAvailability);

router.get('/:id', slotController.getSlotById);

router.put('/:id', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), validateRequest(updateSlotSchema), slotController.updateSlot);

router.delete('/:id', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), slotController.deleteSlot);

// Availability Routes

// Bulk Operations (Optional)
router.post('/bulk', authenticate, authorize([ROLES.HOSPITAL, ROLES.DOCTOR, ROLES.LAB]), slotController.bulkCreateSlots);

module.exports = router;
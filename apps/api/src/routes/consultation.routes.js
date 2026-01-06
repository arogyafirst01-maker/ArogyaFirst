const express = require('express');
const { createConsultation,
  getConsultations,
  getConsultationById,
  updateConsultationStatus,
  addConsultationNote,
  generateConsultationAgoraToken,
  saveChatMessage,
  getChatHistory } = require('../controllers/consultation.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { authorize } = require('../middleware/rbac.middleware.js');
const { validateRequest, createConsultationSchema, updateConsultationStatusSchema, addConsultationNoteSchema, saveChatMessageSchema, getConsultationsSchema } = require('../middleware/validation.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

// Get consultations (role-aware: doctor or patient)
router.get('/', authenticate, validateRequest(getConsultationsSchema), getConsultations);

// Create new consultation (doctor only)
router.post('/create', authenticate, authorize([ROLES.DOCTOR]), validateRequest(createConsultationSchema), createConsultation);

// Get single consultation details
router.get('/:id', authenticate, getConsultationById);

// Update consultation status (doctor only)
router.put('/:id/status', authenticate, authorize([ROLES.DOCTOR]), validateRequest(updateConsultationStatusSchema), updateConsultationStatus);

// Add consultation note (doctor only)
router.post('/:id/notes', authenticate, authorize([ROLES.DOCTOR]), validateRequest(addConsultationNoteSchema), addConsultationNote);

// Generate Agora token for video call (doctor or patient)
router.post('/:id/agora-token', authenticate, generateConsultationAgoraToken);

// Save chat message (doctor or patient)
router.post('/:id/messages', authenticate, validateRequest(saveChatMessageSchema), saveChatMessage);

// Get chat history (doctor or patient)
router.get('/:id/messages', authenticate, getChatHistory);

module.exports = router;

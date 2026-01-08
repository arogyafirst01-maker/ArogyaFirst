import express from 'express';
import {
  createConsultation,
  getConsultations,
  getConsultationById,
  updateConsultationStatus,
  addConsultationNote,
  generateConsultationAgoraToken,
  saveChatMessage,
  getChatHistory
} from '../controllers/consultation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/rbac.middleware.js';
import { validateRequest, createConsultationSchema, updateConsultationStatusSchema, addConsultationNoteSchema, saveChatMessageSchema, getConsultationsSchema } from '../middleware/validation.middleware.js';
import { ROLES } from '@arogyafirst/shared';

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

export default router;

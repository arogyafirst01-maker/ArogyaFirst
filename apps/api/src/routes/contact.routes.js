import express from 'express';
import { submitContactForm } from '../controllers/contact.controller.js';
import { validateRequest } from '../middleware/validation.middleware.js';
import { contactFormSchema } from '../middleware/validation.middleware.js';

const router = express.Router();

// POST /api/contact/submit - Public endpoint to submit contact form
router.post('/submit', validateRequest(contactFormSchema), submitContactForm);

export default router;

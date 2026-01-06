const express = require('express');
const { submitContactForm } = require('../controllers/contact.controller.js');
const { validateRequest } = require('../middleware/validation.middleware.js');
const { contactFormSchema } = require('../middleware/validation.middleware.js');

const router = express.Router();

// POST /api/contact/submit - Public endpoint to submit contact form
router.post('/submit', validateRequest(contactFormSchema), submitContactForm);

module.exports = router;

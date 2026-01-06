const express = require('express');
const { getArticles } = require('../controllers/healthAwareness.controller.js');
const { validateRequest, getHealthArticlesSchema } = require('../middleware/validation.middleware.js');

const router = express.Router();

// Public route for health awareness articles
router.get('/articles', validateRequest(getHealthArticlesSchema), getArticles);

module.exports = router;

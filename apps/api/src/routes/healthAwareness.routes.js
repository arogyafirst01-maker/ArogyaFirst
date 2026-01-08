import express from 'express';
import { getArticles } from '../controllers/healthAwareness.controller.js';
import { validateRequest, getHealthArticlesSchema } from '../middleware/validation.middleware.js';

const router = express.Router();

// Public route for health awareness articles
router.get('/articles', validateRequest(getHealthArticlesSchema), getArticles);

export default router;

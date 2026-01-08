import express from 'express';
import { searchProviders, getProviderDetails, searchProvidersByRole } from '../controllers/provider.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { ROLES } from '@arogyafirst/shared';

const router = express.Router();

// GET /search - Search providers by entity type and filters (public access)
router.get('/search', searchProviders);

// GET /by-role - Search verified providers by role (authenticated access)
router.get('/by-role', authenticate, searchProvidersByRole);

// GET /:providerId - Get provider details (public access for browsing)
router.get('/:providerId', getProviderDetails);

export default router;
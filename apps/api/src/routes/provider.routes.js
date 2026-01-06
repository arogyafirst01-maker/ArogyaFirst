const express = require('express');
const { searchProviders, getProviderDetails, searchProvidersByRole } = require('../controllers/provider.controller.js');
const { authenticate } = require('../middleware/auth.middleware.js');
const { ROLES } = require('@arogyafirst/shared');

const router = express.Router();

// GET /search - Search providers by entity type and filters (public access)
router.get('/search', searchProviders);

// GET /by-role - Search verified providers by role (authenticated access)
router.get('/by-role', authenticate, searchProvidersByRole);

// GET /:providerId - Get provider details (public access for browsing)
router.get('/:providerId', getProviderDetails);

module.exports = router;
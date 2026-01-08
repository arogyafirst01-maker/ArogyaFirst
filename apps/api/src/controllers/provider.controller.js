import User from '../models/User.model.js';
import Slot from '../models/Slot.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { ROLES, BOOKING_TYPES } from '@arogyafirst/shared';

/**
 * Search providers by entity type and filters
 */
const searchProviders = async (req, res) => {
  try {
    const { entityType, search, specialization, testType, startDate, locationId } = req.query;

    console.log('Provider search request:', { entityType, search, specialization, testType, startDate, locationId });

    // Validate entityType
    if (!entityType || !Object.values(BOOKING_TYPES).includes(entityType)) {
      return errorResponse(res, 'Invalid or missing entityType. Must be OPD, IPD, or LAB', 400);
    }

    const roleFilter = buildProviderRoleFilter(entityType);

    // Default startDate to today if not provided
    const start = startDate ? new Date(startDate) : new Date();
    start.setHours(0, 0, 0, 0);

    // Build slot filter - add locationId support
    const slotFilter = {
      entityType,
      providerRole: { $in: roleFilter },
      isActive: true,
      availableCapacity: { $gt: 0 },
      date: { $gte: start }
    };

    // Add locationId filter if provided
    if (locationId && locationId !== 'all') {
      slotFilter.locationId = locationId;
    }

    // Get providerIds with available slots and matching providerRole
    const providerIds = await Slot.find(slotFilter).distinct('providerId');

    if (providerIds.length === 0) {
      return successResponse(res, [], 'No providers found with available slots');
    }

    // Fetch verified providers
    let query = {
      _id: { $in: providerIds },
      isVerified: true,
      verificationStatus: 'APPROVED',
      role: { $in: roleFilter }
    };

    const users = await User.find(query).select('_id email role uniqueId isVerified verificationStatus hospitalData doctorData labData');

    console.log('Found users:', users.length);

    // Apply additional filters
    let filteredUsers = users;

    // Filter by search term (matches both name and location)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredUsers = filteredUsers.filter(user => {
        let nameMatch = false;
        let locationMatch = false;

        // Check name match
        if (user.role === ROLES.HOSPITAL && user.hospitalData?.name) {
          nameMatch = user.hospitalData.name.toLowerCase().includes(searchLower);
        } else if (user.role === ROLES.DOCTOR && user.doctorData?.name) {
          nameMatch = user.doctorData.name.toLowerCase().includes(searchLower);
        } else if (user.role === ROLES.LAB && user.labData?.name) {
          nameMatch = user.labData.name.toLowerCase().includes(searchLower);
        }

        // Check location match
        if (user.role === ROLES.HOSPITAL && user.hospitalData?.location) {
          locationMatch = user.hospitalData.location.toLowerCase().includes(searchLower);
        } else if (user.role === ROLES.DOCTOR && user.doctorData?.location) {
          locationMatch = user.doctorData.location.toLowerCase().includes(searchLower);
        } else if (user.role === ROLES.LAB && user.labData?.location) {
          locationMatch = user.labData.location.toLowerCase().includes(searchLower);
        }

        // Return true if either name or location matches
        return nameMatch || locationMatch;
      });
    }

    if (specialization && entityType === BOOKING_TYPES.OPD) {
      const specLower = specialization.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.role === ROLES.DOCTOR && user.doctorData?.specialization?.toLowerCase().includes(specLower)
      );
    }

    if (testType && entityType === BOOKING_TYPES.LAB) {
      const testTypeLower = testType.toLowerCase();
      filteredUsers = filteredUsers.filter(user =>
        user.role === ROLES.LAB && user.labData?.facilities?.some(f => f.toLowerCase().includes(testTypeLower))
      );
    }

    // Transform to consistent format and sort by name
    const providers = filteredUsers.map(extractProviderInfo).sort((a, b) => a.name.localeCompare(b.name));

    console.log('Filtered providers:', providers.length);

    return successResponse(res, providers, 'Providers retrieved successfully');
  } catch (error) {
    console.error('Error in searchProviders:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Get detailed provider information
 */
const getProviderDetails = async (req, res) => {
  try {
    const { providerId } = req.params;

    const user = await User.findById(providerId).select('_id email role uniqueId isVerified verificationStatus hospitalData doctorData labData');

    if (!user) {
      return errorResponse(res, 'Provider not found', 404);
    }

    if (user.role === ROLES.PATIENT || user.role === ROLES.ADMIN) {
      return errorResponse(res, 'User is not a provider', 400);
    }

    if (!user.isVerified || user.verificationStatus !== 'APPROVED') {
      return errorResponse(res, 'Provider is not verified', 400);
    }

    // Calculate available slot count for next 7 days
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 7);

    const availableSlotCount = await Slot.countDocuments({
      providerId: user._id,
      isActive: true,
      availableCapacity: { $gt: 0 },
      date: { $gte: today, $lte: endDate }
    });

    const providerDetails = {
      ...extractProviderInfo(user),
      availableSlotCount,
      hospitalData: user.hospitalData,
      doctorData: user.doctorData,
      labData: user.labData
    };

    // If chain parent, include branches array
    if (user.role === ROLES.HOSPITAL && user.hospitalData?.isChain && user.hospitalData?.branchLocations?.length > 0) {
      const branches = await User.find(
        { _id: { $in: user.hospitalData.branchLocations } },
        '_id hospitalData.name hospitalData.location hospitalData.branchCode'
      ).lean();
      
      providerDetails.branches = branches.map(branch => ({
        locationId: branch._id,
        name: branch.hospitalData?.name,
        location: branch.hospitalData?.location,
        branchCode: branch.hospitalData?.branchCode
      }));
    }

    return successResponse(res, providerDetails, 'Provider details retrieved successfully');
  } catch (error) {
    console.error('Error in getProviderDetails:', error);
    return errorResponse(res, 'Internal server error', 500);
  }
};

/**
 * Extract provider info from user document
 */
const extractProviderInfo = (user) => {
  let name, location, specialization, experience, availableTests, branchCode, chainName, isChainBranch, locationId;

  if (user.role === ROLES.HOSPITAL) {
    name = user.hospitalData?.name;
    location = user.hospitalData?.location;
    specialization = null;
    experience = null;
    availableTests = null;
    branchCode = user.hospitalData?.branchCode;
    chainName = user.hospitalData?.chainName;
    isChainBranch = !!user.hospitalData?.parentHospitalId;
    locationId = isChainBranch ? user._id : null;
  } else if (user.role === ROLES.DOCTOR) {
    name = user.doctorData?.name;
    location = user.doctorData?.location;
    specialization = user.doctorData?.specialization;
    experience = user.doctorData?.experience;
    availableTests = null;
  } else if (user.role === ROLES.LAB) {
    name = user.labData?.name;
    location = user.labData?.location;
    specialization = null;
    experience = null;
    availableTests = user.labData?.facilities;
  }

  return {
    _id: user._id,
    name,
    role: user.role,
    location,
    specialization,
    experience,
    availableTests,
    branchCode,
    chainName,
    isChainBranch,
    locationId,
  };
};

/**
 * Build provider role filter based on entity type
 */
const buildProviderRoleFilter = (entityType) => {
  switch (entityType) {
    case BOOKING_TYPES.OPD:
      return [ROLES.HOSPITAL, ROLES.DOCTOR];
    case BOOKING_TYPES.IPD:
      return [ROLES.HOSPITAL];
    case BOOKING_TYPES.LAB:
      return [ROLES.LAB];
    default:
      return [];
  }
};

/**
 * Search verified providers by role
 * Used for referrals and other internal searches
 */
const searchProvidersByRole = async (req, res) => {
  try {
    const { role } = req.query;

    if (!role || !Object.values(ROLES).includes(role)) {
      return errorResponse(res, 'Invalid or missing role parameter', 400);
    }

    // Find all verified users with the specified role
    const users = await User.find({
      role,
      isVerified: true,
      verificationStatus: 'APPROVED',
      isActive: true
    }).select('_id email role uniqueId hospitalData doctorData labData pharmacyData');

    // Format the response based on role
    const providers = users.map(user => {
      let name = user.email;
      let location = '';
      
      if (user.role === ROLES.DOCTOR && user.doctorData) {
        name = user.doctorData.name || user.email;
        location = user.doctorData.location || '';
      } else if (user.role === ROLES.PHARMACY && user.pharmacyData) {
        name = user.pharmacyData.name || user.email;
        location = user.pharmacyData.location || '';
      } else if (user.role === ROLES.LAB && user.labData) {
        name = user.labData.name || user.email;
        location = user.labData.location || '';
      } else if (user.role === ROLES.HOSPITAL && user.hospitalData) {
        name = user.hospitalData.name || user.email;
        location = user.hospitalData.location || '';
      }

      return {
        _id: user._id,
        email: user.email,
        role: user.role,
        name,
        location
      };
    });

    return successResponse(res, providers, `Found ${providers.length} verified ${role}s`);
  } catch (error) {
    console.error('Error searching providers by role:', error);
    return errorResponse(res, 'Failed to search providers', 500);
  }
};

export { searchProviders, getProviderDetails, searchProvidersByRole };
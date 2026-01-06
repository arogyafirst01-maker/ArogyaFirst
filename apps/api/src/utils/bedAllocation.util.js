const Booking = require('../models/Booking.model.js');
const User = require('../models/User.model.js');
const { BED_ASSIGNMENT_STATUS, PRIORITY_LEVELS, BED_TYPES, BOOKING_TYPES, BOOKING_STATUS } = require('@arogyafirst/shared');
const dayjs = require('dayjs');

/**
 * Calculate priority score for a booking based on medical urgency, waiting time, and age
 * @param {Object} booking - Booking document
 * @param {Number} patientAge - Patient age
 * @param {Number} medicalUrgency - Medical urgency score (0-10 scale)
 * @returns {Object} { score, priority, breakdown }
 */
const calculatePriorityScore = (booking, patientAge = null, medicalUrgency = 0, otherFactorsParam = 0) => {
  // Accept otherFactors via controller param to avoid hidden metadata coupling
  let score = 0;
  const breakdown = {};

  // Medical urgency: max 40 points
  const urgencyPoints = Math.min(medicalUrgency * 4, 40);
  breakdown.medicalUrgency = urgencyPoints;
  score += urgencyPoints;

  // Waiting time: max 30 points (1 point per 2.4 hours)
  const joinedQueueAt = booking.queueMetadata?.joinedQueueAt || booking.createdAt;
  const hoursInQueue = dayjs().diff(dayjs(joinedQueueAt), 'hour');
  const waitingTimePoints = Math.min((hoursInQueue / 2.4) * 1, 30);
  breakdown.waitingTime = Math.round(waitingTimePoints);
  score += waitingTimePoints;

  // Age score: max 20 points
  let ageScore = 0;
  if (patientAge) {
    if (patientAge > 65 || patientAge < 5) {
      ageScore = 20;
    } else if (patientAge > 50 || patientAge < 12) {
      ageScore = 10;
    }
  }
  breakdown.ageScore = ageScore;
  score += ageScore;

  // Other factors: max 10 points
  const otherFactors = otherFactorsParam || 0;
  breakdown.otherFactors = Math.min(otherFactors, 10);
  score += breakdown.otherFactors;

  // Total score (0-100)
  const totalScore = Math.round(Math.min(score, 100));

  // Determine priority level
  let priorityLevel = PRIORITY_LEVELS.MEDIUM;
  if (totalScore >= 90) {
    priorityLevel = PRIORITY_LEVELS.CRITICAL;
  } else if (totalScore >= 70) {
    priorityLevel = PRIORITY_LEVELS.HIGH;
  } else if (totalScore < 40) {
    priorityLevel = PRIORITY_LEVELS.LOW;
  }

  return {
    score: totalScore,
    priority: priorityLevel,
    breakdown: {
      ...breakdown,
      calculatedAt: new Date()
    }
  };
};

/**
 * Check if a bed type is compatible with the requested bed type.
 * Allows safe upgrades (e.g., GENERAL -> ICU/PRIVATE, EMERGENCY -> ICU/PRIVATE, ICU -> PRIVATE).
 */
const isBedTypeCompatible = (requestedType, bedType) => {
  if (!requestedType || !bedType) return true;
  if (requestedType === bedType) return true;

  const upgradeMap = {
    [BED_TYPES.EMERGENCY]: [BED_TYPES.ICU, BED_TYPES.PRIVATE],
    [BED_TYPES.ICU]: [BED_TYPES.PRIVATE],
    [BED_TYPES.GENERAL]: [BED_TYPES.ICU, BED_TYPES.PRIVATE],
    [BED_TYPES.PRIVATE]: [],
  };

  const allowed = upgradeMap[requestedType] || [];
  return allowed.includes(bedType);
};

/**
 * Find available beds in a hospital
 * @param {String} hospitalId - Hospital user ID
 * @param {String} bedType - Specific bed type to filter (optional)
 * @param {String} locationId - Location ID for multi-location hospitals (optional)
 * @param {String} floor - Floor number (optional)
 * @param {String} ward - Ward name (optional)
 * @returns {Array} Available beds with details
 */
const findAvailableBeds = async (hospitalId, bedType = null, locationId = null, floor = null, ward = null) => {
  const hospital = await User.findById(hospitalId).select('hospitalData').lean();
  if (!hospital || !hospital.hospitalData) {
    return [];
  }

  const allBeds = hospital.hospitalData.beds || [];
  const availableBeds = [];

  // Iterate original beds array and keep track of original index as bedIndex (not filtered position)
  for (let i = 0; i < allBeds.length; i++) {
    const bed = allBeds[i];

    // Filter by active and not occupied
    if (!bed.isActive || bed.isOccupied) continue;

    // Filter by location if provided
    if (locationId) {
      // Prefer explicit bed.locationId association if present; fallback to ward name matching
      const bedLocId = (bed.locationId && bed.locationId.toString) ? bed.locationId.toString() : bed.locationId;
      if (bedLocId) {
        if (bedLocId !== locationId) continue;
      } else {
        const location = hospital.hospitalData.branchLocations?.find(
          b => b._id?.toString() === locationId || b.locationId === locationId
        );
        if (location && location.name && bed.ward !== location.name) {
          continue;
        }
      }
    }

    // Filter by bed type if provided
    if (bedType && Object.values(BED_TYPES).includes(bedType)) {
      if (bed.type !== bedType) continue;
    }

    // Filter by floor if provided
    if (floor && bed.floor !== floor) continue;

    // Filter by ward if provided
    if (ward && bed.ward !== ward) continue;

    // Add bed with original index (bedIndex), not filtered position (index)
    availableBeds.push({
      ...bed,
      bedId: bed._id?.toString() || i.toString(),
      bedIndex: i
    });
  }

  return availableBeds;
};

/**
 * Match a bed to patient requirement based on scoring
 * @param {Object} bedRequirement - Patient's bed requirement
 * @param {Array} availableBeds - List of available beds
 * @returns {Object} Best match bed with score, or null
 */
const matchBedToPatient = (bedRequirement, availableBeds) => {
  if (!bedRequirement || !availableBeds || availableBeds.length === 0) {
    return null;
  }

  const scoredBeds = availableBeds.map(bed => {
    let score = 0;

    // Exact bed type match: +50 points
    if (bed.type === bedRequirement.bedType) {
      score += 50;
    } else if (
      // Compatible bed types
      (bedRequirement.bedType === BED_TYPES.EMERGENCY && [BED_TYPES.ICU, BED_TYPES.PRIVATE].includes(bed.type)) ||
      (bedRequirement.bedType === BED_TYPES.ICU && bed.type === BED_TYPES.PRIVATE)
    ) {
      score += 30;
    }

    // Preferred floor match: +10 points
    if (bedRequirement.preferredFloor && bed.floor === bedRequirement.preferredFloor) {
      score += 10;
    }

    // Preferred ward match: +10 points
    if (bedRequirement.preferredWard && bed.ward === bedRequirement.preferredWard) {
      score += 10;
    }

    // Special requirements met: +5 points per requirement
    if (bedRequirement.specialRequirements && bedRequirement.specialRequirements.length > 0) {
      const bedSpecialRequirements = bed.specialRequirements || [];
      const metRequirements = bedRequirement.specialRequirements.filter(req =>
        bedSpecialRequirements.includes(req)
      );
      score += metRequirements.length * 5;
    }

    return { bed, score };
  });

  // Sort by score descending
  scoredBeds.sort((a, b) => b.score - a.score);

  return scoredBeds[0].score > 0 ? scoredBeds[0] : null;
};

/**
 * Update queue positions for all waiting bookings
 * Recalculates queuePosition and estimatedWaitTime for each booking
 * @param {String} hospitalId - Hospital user ID
 * @param {String} locationId - Location ID (optional)
 * @returns {Promise<Number>} Number of updated bookings
 */
const updateQueuePositions = async (hospitalId, locationId = null) => {
  const query = {
    providerId: hospitalId,
    entityType: BOOKING_TYPES.IPD,
    bedAssignmentStatus: BED_ASSIGNMENT_STATUS.WAITING_IN_QUEUE
  };

  if (locationId) {
    query.locationId = locationId;
  }

  const bookings = await Booking.find(query)
    .sort({ priorityScore: -1, 'queueMetadata.joinedQueueAt': 1 })
    .lean();

  let updatedCount = 0;
  for (let i = 0; i < bookings.length; i++) {
    const newPosition = i + 1;
    // Use estimateWaitTime utility to calculate wait time based on position
    const waitTimeData = estimateWaitTime(newPosition, 48);
    
    await Booking.findByIdAndUpdate(
      bookings[i]._id,
      { 
        queuePosition: newPosition,
        $set: { 'queueMetadata.estimatedWaitTime': waitTimeData.hours }
      },
      { new: true }
    );
    updatedCount++;
  }

  return updatedCount;
};

/**
 * Estimate wait time based on queue position
 * @param {Number} queuePosition - Position in queue
 * @param {Number} averageBedTurnoverHours - Average bed turnover hours (default 48)
 * @returns {Object} { hours, readable }
 */
const estimateWaitTime = (queuePosition, averageBedTurnoverHours = 48) => {
  const hours = queuePosition * averageBedTurnoverHours;
  const days = Math.ceil(hours / 24);
  const readable = `${Math.floor(days / 7)}-${days} days`;

  return { hours, days, readable };
};

module.exports = Booking;

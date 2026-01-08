import User from '../models/User.model.js';
import Booking from '../models/Booking.model.js';
import Document from '../models/Document.model.js';
import Slot from '../models/Slot.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { updateUserSettings } from '../utils/settings.util.js';
import { generateCSV, generatePDF, formatDateForExport, sanitizeFilename, formatCurrency } from '../utils/export.util.js';
import { sendLabReportNotificationEmail } from '../utils/email.util.js';
import { withTransaction } from '../utils/transaction.util.js';
import { ROLES, BOOKING_STATUS, PAYMENT_STATUS, BOOKING_TYPES, DOCUMENT_UPLOAD_SOURCE, DOCUMENT_TYPES } from '@arogyafirst/shared';
import { parse } from 'csv-parse/sync';

export const getProfile = async (req, res) => {
  try {
    if (req.user.role !== ROLES.LAB) {
      return errorResponse(res, 'Access denied: Lab role required', 403);
    }
    // Return a sanitized profile shape matching /api/auth/me
    const profile = {
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      uniqueId: req.user.uniqueId,
      verificationStatus: req.user.verificationStatus,
      isActive: req.user.isActive,
      labData: req.user.labData
    };
    return successResponse(res, { user: profile }, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, location } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (name !== undefined) user.labData.name = name;
    if (location !== undefined) user.labData.location = location;
    await user.save();
    
    // Create default slots if lab doesn't have any active slots
    const existingSlots = await Slot.countDocuments({
      providerId: userId,
      entityType: BOOKING_TYPES.LAB,
      isActive: true
    });
    
    if (existingSlots === 0) {
      // Create default slots for next 30 days
      const slots = [];
      const now = new Date();
      for (let i = 0; i < 30; i++) {
        const slotDate = new Date(now);
        slotDate.setDate(slotDate.getDate() + i);
        slotDate.setHours(0, 0, 0, 0);
        
        // Create slots for different time periods
        slots.push({
          providerId: userId,
          entityType: BOOKING_TYPES.LAB,
          providerRole: ROLES.LAB,
          date: slotDate,
          startTime: '09:00',
          endTime: '13:00',
          capacity: 20,
          bookedCount: 0,
          availableCapacity: 20,
          isActive: true,
          createdBy: userId
        },
        {
          providerId: userId,
          entityType: BOOKING_TYPES.LAB,
          providerRole: ROLES.LAB,
          date: slotDate,
          startTime: '14:00',
          endTime: '18:00',
          capacity: 20,
          bookedCount: 0,
          availableCapacity: 20,
          isActive: true,
          createdBy: userId
        });
      }
      
      await Slot.insertMany(slots);
      console.log(`Created ${slots.length} default slots for lab ${userId}`);
    }
    
    // Sanitize profile to match /api/auth/me shape
    const profile = {
      _id: user._id,
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId,
      verificationStatus: user.verificationStatus,
      isActive: user.isActive,
      labData: user.labData
    };
    return successResponse(res, { user: profile }, 'Profile updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

export const getMachines = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    // Preserve original array indices so clients can safely reference items for mutations.
    const rawMachines = Array.isArray(user.labData?.machines) ? user.labData.machines : [];
    const mapped = rawMachines.map((m, i) => {
      const obj = m && m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
      obj.originalIndex = i;
      return obj;
    });

    let machines = mapped;
    if (req.query.activeOnly === 'true') {
      machines = machines.filter(machine => machine.isActive);
    }
    machines.sort((a, b) => new Date(b.addedAt) - new Date(a.addedAt));
    return successResponse(res, { machines }, 'Machines retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve machines', 500);
  }
};

export const addMachine = async (req, res) => {
  try {
    const { name, model, manufacturer, purchaseDate, lastMaintenanceDate, nextMaintenanceDate, status } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const machine = {
      name,
      model,
      manufacturer,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      lastMaintenanceDate: lastMaintenanceDate ? new Date(lastMaintenanceDate) : undefined,
      nextMaintenanceDate: nextMaintenanceDate ? new Date(nextMaintenanceDate) : undefined,
      status
    };
    user.labData.machines.push(machine);
    user.markModified('labData.machines');
    await user.save();
    const index = user.labData.machines.length - 1;
    const created = user.labData.machines[index] && user.labData.machines[index].toObject
      ? user.labData.machines[index].toObject()
      : JSON.parse(JSON.stringify(user.labData.machines[index]));
    created.originalIndex = index;
    return successResponse(res, { machine: created, index }, 'Machine added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add machine', 500);
  }
};

export const updateMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const machine = user.labData.machines.id(id);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }
    const updates = req.body || {};
    const allowed = ['name', 'model', 'manufacturer', 'purchaseDate', 'lastMaintenanceDate', 'nextMaintenanceDate', 'status', 'isActive'];
    const assigned = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        if (key.includes('Date')) {
          // Convert falsy/null to undefined so Mongoose will omit the field
          assigned[key] = updates[key] ? new Date(updates[key]) : undefined;
        } else {
          assigned[key] = updates[key];
        }
      }
    }
    Object.assign(machine, assigned);
    user.markModified('labData.machines');
    await user.save();
    const updated = machine.toObject ? machine.toObject() : JSON.parse(JSON.stringify(machine));
    updated.originalIndex = user.labData.machines.indexOf(machine); // Keep originalIndex for backward compatibility
    return successResponse(res, { machine: updated }, 'Machine updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update machine', 500);
  }
};

export const deleteMachine = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const machine = user.labData.machines.id(id);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }
    machine.isActive = false;
    user.markModified('labData.machines');
    await user.save();
    return successResponse(res, null, 'Machine deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete machine', 500);
  }
};

export const addQCRecord = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { date, testType, result, parameters, performedBy, notes } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const machine = user.labData.machines.id(machineId);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }

    const qcId = `QC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const qcRecord = {
      qcId,
      date: new Date(date),
      testType,
      result,
      parameters,
      performedBy,
      notes,
      createdAt: new Date()
    };

    machine.qcRecords.push(qcRecord);
    user.markModified('labData.machines');
    await user.save();

    const recordIndex = machine.qcRecords.findIndex(r => r.qcId === qcId);
    return successResponse(res, { qcRecord, index: recordIndex }, 'QC record added successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to add QC record', 500);
  }
};

export const getQCRecords = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { limit = 50 } = req.query;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const machine = user.labData.machines.id(machineId);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }

    const qcRecords = (machine.qcRecords || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    return successResponse(res, { 
      qcRecords, 
      machineName: machine.name,
      total: (machine.qcRecords || []).length
    }, 'QC records retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve QC records', 500);
  }
};

export const updateQCRecord = async (req, res) => {
  try {
    const { machineId, qcId } = req.params;
    const updates = req.body;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const machine = user.labData.machines.id(machineId);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }

    const qcRecord = machine.qcRecords.find(r => r.qcId === qcId);
    if (!qcRecord) {
      return errorResponse(res, 'QC record not found', 404);
    }

    const allowedFields = ['date', 'testType', 'result', 'parameters', 'performedBy', 'notes'];
    allowedFields.forEach(field => {
      if (field in updates) {
        if (field === 'date') {
          qcRecord[field] = new Date(updates[field]);
        } else {
          qcRecord[field] = updates[field];
        }
      }
    });

    user.markModified('labData.machines');
    await user.save();

    return successResponse(res, { qcRecord }, 'QC record updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update QC record', 500);
  }
};

export const deleteQCRecord = async (req, res) => {
  try {
    const { machineId, qcId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const machine = user.labData.machines.id(machineId);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }

    const recordIndex = machine.qcRecords.findIndex(r => r.qcId === qcId);
    if (recordIndex === -1) {
      return errorResponse(res, 'QC record not found', 404);
    }

    machine.qcRecords.splice(recordIndex, 1);
    user.markModified('labData.machines');
    await user.save();

    return successResponse(res, null, 'QC record deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete QC record', 500);
  }
};

export const getQCTrends = async (req, res) => {
  try {
    const { machineId } = req.params;
    const { startDate, endDate, testType } = req.query;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const machine = user.labData.machines.id(machineId);
    if (!machine) {
      return errorResponse(res, 'Machine not found', 404);
    }

    let qcRecords = machine.qcRecords || [];

    if (startDate || endDate) {
      const start = startDate ? new Date(startDate) : new Date(0);
      const end = endDate ? new Date(endDate) : new Date();
      qcRecords = qcRecords.filter(r => new Date(r.date) >= start && new Date(r.date) <= end);
    }

    if (testType) {
      qcRecords = qcRecords.filter(r => r.testType === testType);
    }

    const trendMap = {};
    qcRecords.forEach(record => {
      const dateStr = new Date(record.date).toISOString().split('T')[0];
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { date: dateStr, total: 0, pass: 0, fail: 0, warning: 0, passRate: 0 };
      }
      trendMap[dateStr].total++;
      
      // Explicit mapping from QC result enum values to counter keys
      switch (record.result) {
        case 'PASS':
          trendMap[dateStr].pass++;
          break;
        case 'FAIL':
          trendMap[dateStr].fail++;
          break;
        case 'WARNING':
          trendMap[dateStr].warning++;
          break;
        // Future enum values can be handled here if needed
      }
    });

    const trendData = Object.values(trendMap)
      .map(item => ({
        ...item,
        passRate: item.total > 0 ? Math.round((item.pass / item.total) * 100) : 0
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalTests = qcRecords.length;
    const passCount = qcRecords.filter(r => r.result === 'PASS').length;
    const overallPassRate = totalTests > 0 ? Math.round((passCount / totalTests) * 100) : 0;
    const lastTest = qcRecords.length > 0 ? qcRecords[qcRecords.length - 1].date : null;

    return successResponse(res, {
      trendData,
      machineName: machine.name,
      summaryStats: {
        totalTests,
        overallPassRate,
        lastTestDate: lastTest
      }
    }, 'QC trends retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve QC trends', 500);
  }
};

export const getFacilities = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    return successResponse(res, { facilities: user.labData.facilities }, 'Facilities retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve facilities', 500);
  }
};

export const addFacility = async (req, res) => {
  try {
    const { facility } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const normalizedFacility = facility.trim().toLowerCase();
    const exists = user.labData.facilities.some(f => f.trim().toLowerCase() === normalizedFacility);
    if (exists) {
      return errorResponse(res, 'Facility already exists', 400);
    }
    user.labData.facilities.push(facility);
    user.markModified('labData.facilities');
    await user.save();
    return successResponse(res, { facilities: user.labData.facilities }, 'Facility added successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to add facility', 500);
  }
};

export const deleteFacility = async (req, res) => {
  try {
    const { index } = req.params;
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return errorResponse(res, 'Invalid facility index', 400);
    }
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.LAB) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (idx >= user.labData.facilities.length) {
      return errorResponse(res, 'Facility not found', 404);
    }
    user.labData.facilities.splice(idx, 1);
    user.markModified('labData.facilities');
    await user.save();
    return successResponse(res, null, 'Facility deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete facility', 500);
  }
};

export const getDashboard = async (req, res) => {
  try {
    const labId = req.params.id;
    const userId = req.user._id;
    
    // Verify authorization
    if (labId !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only access your own dashboard', 403);
    }
    
    // Verify user is a lab
    const lab = await User.findById(labId);
    if (!lab || lab.role !== ROLES.LAB) {
      return errorResponse(res, 'Lab not found', 404);
    }
    
    // Parse optional date range filters from query
    const { startDate, endDate } = req.query;
    let filterStartDate, filterEndDate;
    
    try {
      if (startDate) {
        filterStartDate = new Date(startDate);
        if (isNaN(filterStartDate.getTime())) {
          return errorResponse(res, 'Invalid startDate format. Use ISO date string.', 400);
        }
      }
      if (endDate) {
        filterEndDate = new Date(endDate);
        if (isNaN(filterEndDate.getTime())) {
          return errorResponse(res, 'Invalid endDate format. Use ISO date string.', 400);
        }
      }
    } catch (err) {
      return errorResponse(res, 'Error parsing date filters', 400);
    }
    
    // Calculate canonical date window for aggregations
    const now = new Date();
    const defaultWindowDays = 30;
    const rangeEnd = filterEndDate || now;
    const rangeStart = filterStartDate || new Date(rangeEnd.getTime() - defaultWindowDays * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    // Get metrics using aggregation
    const metricsAgg = await Booking.aggregate([
      {
        $match: {
          providerId: lab._id,
          entityType: 'LAB'
        }
      },
      {
        $facet: {
          // Total bookings in the period
          monthlyBookings: [
            { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
            { $count: 'count' }
          ],
          // Revenue in the period (completed bookings)
          monthlyRevenue: [
            {
              $match: {
                createdAt: { $gte: rangeStart, $lte: rangeEnd },
                status: BOOKING_STATUS.COMPLETED,
                paymentStatus: PAYMENT_STATUS.SUCCESS
              }
            },
            {
              $group: {
                _id: null,
                total: { $sum: '$paymentAmount' }
              }
            }
          ],
          // Pending reports (completed but no report uploaded)
          pendingReports: [
            {
              $match: {
                status: BOOKING_STATUS.COMPLETED,
                createdAt: { $gte: rangeStart, $lte: rangeEnd }
              }
            },
            {
              $lookup: {
                from: 'documents',
                let: { bookingId: '$_id' },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ['$bookingId', '$$bookingId'] },
                          { $eq: ['$documentType', 'LAB_REPORT'] }
                        ]
                      }
                    }
                  }
                ],
                as: 'reports'
              }
            },
            {
              $match: {
                reports: { $size: 0 }
              }
            },
            { $count: 'count' }
          ],
          // Status breakdown
          statusCounts: [
            {
              $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } }
            },
            {
              $group: {
                _id: '$status',
                count: { $count: {} }
              }
            }
          ],
          // Bookings over time (last 30 days, grouped by day)
          bookingsOverTime: [
            {
              $match: {
                createdAt: { $gte: rangeStart, $lte: rangeEnd }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt'
                  }
                },
                count: { $count: {} }
              }
            },
            {
              $sort: { _id: 1 }
            },
            {
              $project: {
                _id: 0,
                date: '$_id',
                count: 1
              }
            }
          ]
        }
      }
    ]);
    
    const metrics = metricsAgg[0];
    
    // Get upcoming bookings (next 7 days)
    const upcomingBookings = await Booking.find({
      providerId: labId,
      entityType: 'LAB',
      bookingDate: {
        $gte: now,
        $lte: sevenDaysFromNow
      },
      status: { $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.PENDING] }
    })
      .populate('patientId', 'name phone email')
      .sort({ bookingDate: 1 })
      .limit(10)
      .lean();
    
    // Get recent completed bookings
    const recentCompletedBookings = await Booking.find({
      providerId: labId,
      entityType: 'LAB',
      status: BOOKING_STATUS.COMPLETED
    })
      .populate('patientId', 'name phone email')
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean();
    
    // Format response
    const dashboard = {
      metrics: {
        totalBookingsThisMonth: metrics.monthlyBookings[0]?.count || 0,
        revenueThisMonth: metrics.monthlyRevenue[0]?.total || 0,
        pendingReports: metrics.pendingReports[0]?.count || 0,
        statusBreakdown: metrics.statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      bookingsOverTime: metrics.bookingsOverTime,
      upcomingBookings,
      recentCompletedBookings
    };
    
    return successResponse(res, { dashboard }, 'Dashboard data retrieved successfully');
  } catch (error) {
    console.error('Get lab dashboard error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve dashboard data', 500);
  }
};

export const exportReport = async (req, res) => {
  try {
    // Authorization: Allow LAB owner or ADMIN
    const { id } = req.params;
    const isLabOwner = req.user.role === ROLES.LAB && id === req.user._id.toString();
    const isAdmin = req.user.role === ROLES.ADMIN;
    
    if (!isLabOwner && !isAdmin) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Extract and validate parameters
    const { reportType, format, startDate, endDate } = req.query;
    
    if (!reportType || !['bookings', 'tests', 'revenue'].includes(reportType)) {
      return errorResponse(res, 'Invalid report type. Allowed: bookings, tests, revenue', 400);
    }
    
    if (!format || !['csv', 'pdf'].includes(format)) {
      return errorResponse(res, 'Invalid format. Allowed: csv, pdf', 400);
    }
    
    if (!startDate || !endDate) {
      return errorResponse(res, 'startDate and endDate are required', 400);
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return errorResponse(res, 'Invalid date format. Use ISO date strings', 400);
    }
    
    // For ADMIN, use the lab ID from params; for LAB owner, use their own ID
    const labId = req.user.role === ROLES.ADMIN ? id : req.user._id;
    let data = [];
    let fields = [];
    let columns = [];
    let title = '';
    
    switch (reportType) {
      case 'bookings': {
        title = 'Lab Bookings Report';
        const bookings = await Booking.find({
          providerId: labId,
          entityType: 'LAB',
          bookingDate: { $gte: start, $lte: end }
        }).populate('patientId', 'name patientData.name phone').lean();
        
        // Check for lab reports
        const bookingIds = bookings.map(b => b._id);
        const reports = await Document.find({
          bookingId: { $in: bookingIds },
          documentType: 'LAB_REPORT'
        }).lean();
        const reportBookingIds = new Set(reports.map(r => r.bookingId.toString()));
        
        data = bookings.map(b => ({
          bookingId: b.bookingId || b._id.toString().slice(-8).toUpperCase(),
          patientName: b.patientId?.patientData?.name || b.patientId?.name || 'N/A',
          date: formatDateForExport(b.bookingDate),
          testType: b.metadata?.testType || 'General',
          status: b.status,
          paymentAmount: b.paymentAmount || 0,
          reportStatus: reportBookingIds.has(b._id.toString()) ? 'Uploaded' : 'Pending'
        }));
        
        fields = [
          { label: 'Booking ID', value: 'bookingId' },
          { label: 'Patient Name', value: 'patientName' },
          { label: 'Date', value: 'date' },
          { label: 'Test Type', value: 'testType' },
          { label: 'Status', value: 'status' },
          { label: 'Payment (₹)', value: 'paymentAmount' },
          { label: 'Report Status', value: 'reportStatus' }
        ];
        
        columns = [
          { header: 'Booking ID', key: 'bookingId', width: 60 },
          { header: 'Patient', key: 'patientName', width: 85 },
          { header: 'Date', key: 'date', width: 65 },
          { header: 'Test Type', key: 'testType', width: 70 },
          { header: 'Status', key: 'status', width: 60 },
          { header: 'Payment', key: 'paymentAmount', width: 55, isCurrency: true },
          { header: 'Report', key: 'reportStatus', width: 55 }
        ];
        break;
      }
      
      case 'tests': {
        title = 'Tests Summary Report';
        const testsAgg = await Booking.aggregate([
          {
            $match: {
              providerId: labId,
              entityType: 'LAB',
              bookingDate: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: '$metadata.testType',
              totalTests: { $sum: 1 },
              completed: {
                $sum: { $cond: [{ $eq: ['$status', BOOKING_STATUS.COMPLETED] }, 1, 0] }
              },
              revenue: {
                $sum: { $cond: [{ $eq: ['$paymentStatus', PAYMENT_STATUS.SUCCESS] }, '$paymentAmount', 0] }
              }
            }
          },
          { $sort: { totalTests: -1 } }
        ]);
        
        // Get pending reports count per test type
        const bookings = await Booking.find({
          providerId: labId,
          entityType: 'LAB',
          bookingDate: { $gte: start, $lte: end },
          status: BOOKING_STATUS.COMPLETED
        }).lean();
        
        const bookingIds = bookings.map(b => b._id);
        const reports = await Document.find({
          bookingId: { $in: bookingIds },
          documentType: 'LAB_REPORT'
        }).lean();
        const reportBookingIds = new Set(reports.map(r => r.bookingId.toString()));
        
        // Count pending reports by test type
        const pendingByTestType = {};
        bookings.forEach(b => {
          const testType = b.metadata?.testType || 'General';
          if (!reportBookingIds.has(b._id.toString())) {
            pendingByTestType[testType] = (pendingByTestType[testType] || 0) + 1;
          }
        });
        
        data = testsAgg.map(t => {
          const key = t._id || 'General';
          return {
            testType: key,
            totalTests: t.totalTests,
            completed: t.completed,
            pendingReports: pendingByTestType[key] || 0,
            revenue: t.revenue
          };
        });
        
        fields = [
          { label: 'Test Type', value: 'testType' },
          { label: 'Total Tests', value: 'totalTests' },
          { label: 'Completed', value: 'completed' },
          { label: 'Pending Reports', value: 'pendingReports' },
          { label: 'Revenue (₹)', value: 'revenue' }
        ];
        
        columns = [
          { header: 'Test Type', key: 'testType', width: 120 },
          { header: 'Total', key: 'totalTests', width: 70 },
          { header: 'Completed', key: 'completed', width: 70 },
          { header: 'Pending', key: 'pendingReports', width: 70 },
          { header: 'Revenue', key: 'revenue', width: 90, isCurrency: true }
        ];
        break;
      }
      
      case 'revenue': {
        title = 'Revenue Report';
        const revenueAgg = await Booking.aggregate([
          {
            $match: {
              providerId: labId,
              entityType: 'LAB',
              bookingDate: { $gte: start, $lte: end },
              paymentStatus: PAYMENT_STATUS.SUCCESS
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$bookingDate' } },
              totalTests: { $sum: 1 },
              totalRevenue: { $sum: '$paymentAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        data = revenueAgg.map(r => ({
          date: formatDateForExport(new Date(r._id)),
          totalTests: r.totalTests,
          totalRevenue: r.totalRevenue,
          averageValue: r.totalTests > 0 ? Math.round(r.totalRevenue / r.totalTests) : 0
        }));
        
        fields = [
          { label: 'Date', value: 'date' },
          { label: 'Total Tests', value: 'totalTests' },
          { label: 'Total Revenue (₹)', value: 'totalRevenue' },
          { label: 'Average Value (₹)', value: 'averageValue' }
        ];
        
        columns = [
          { header: 'Date', key: 'date', width: 100 },
          { header: 'Total Tests', key: 'totalTests', width: 100 },
          { header: 'Total Revenue', key: 'totalRevenue', width: 100, isCurrency: true },
          { header: 'Avg Value', key: 'averageValue', width: 100, isCurrency: true }
        ];
        break;
      }
    }
    
    // Generate export
    const dateRangeStr = `${formatDateForExport(start)} to ${formatDateForExport(end)}`;
    const filename = sanitizeFilename(`lab_${reportType}_${Date.now()}`);
    
    if (format === 'csv') {
      const csvContent = generateCSV(data, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      return res.send(csvContent);
    } else {
      const pdfBuffer = await generatePDF(title, data, columns, { dateRange: dateRangeStr });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
      return res.send(pdfBuffer);
    }
  } catch (error) {
    console.error('Export error:', error);
    return errorResponse(res, 'Failed to generate export', 500);
  }
};

export const getSettings = async (req, res) => {
  try {
    if (req.user.role !== ROLES.LAB) {
      return errorResponse(res, 'Access denied: Lab role required', 403);
    }
    return successResponse(res, { settings: req.user.settings }, 'Settings retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve settings', 500);
  }
};

export const updateSettings = async (req, res) => {
  try {
    const settings = await updateUserSettings({
      userId: req.user._id,
      expectedRole: ROLES.LAB,
      settingsPayload: req.body
    });
    return successResponse(res, { settings }, 'Settings updated successfully');
  } catch (error) {
    if (error.statusCode === 404) {
      return errorResponse(res, error.message, 404);
    }
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update settings', 500);
  }
};

/**
 * Bulk upload lab reports via CSV file
 * CSV columns: bookingId, reportTitle, reportDescription, reportUrl (Cloudinary URL)
 */
export const bulkUploadReports = async (req, res) => {
  try {
    // Validate that CSV file is provided
    if (!req.file) {
      return errorResponse(res, 'CSV file is required', 400);
    }

    const labUserId = req.user._id;
    const labName = req.user.labData?.name || 'Lab';

    // Parse CSV file
    let records;
    try {
      const csvContent = req.file.buffer.toString('utf-8');
      records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (parseError) {
      return errorResponse(res, `CSV parsing error: ${parseError.message}`, 400);
    }

    if (!records || records.length === 0) {
      return errorResponse(res, 'CSV file is empty or has no valid records', 400);
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      details: [],
    };

    // Process records within a transaction for atomicity
    try {
      await withTransaction(async (session) => {
        for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
          const row = records[rowIndex];
          const rowNumber = rowIndex + 2; // +2 to account for header and 1-based indexing

          try {
            // Validate required fields
            if (!row.bookingId || !row.reportTitle || !row.reportUrl) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                bookingId: row.bookingId || 'N/A',
                status: 'error',
                error: 'Missing required fields: bookingId, reportTitle, reportUrl',
              });
              continue;
            }

            // Fetch booking using the business bookingId string
            const booking = await Booking.findOne({ bookingId: row.bookingId })
              .populate('patientId', 'email displayName name')
              .session(session);

            if (!booking) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                bookingId: row.bookingId,
                status: 'error',
                error: 'Booking not found',
              });
              continue;
            }

            // Validate booking belongs to this lab (check providerId and entityType)
            if (booking.providerId.toString() !== labUserId.toString() || booking.entityType !== BOOKING_TYPES.LAB) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                bookingId: row.bookingId,
                status: 'error',
                error: 'Booking does not belong to this lab or is not a lab booking',
              });
              continue;
            }

            // Validate booking status is COMPLETED
            if (booking.status !== BOOKING_STATUS.COMPLETED) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                bookingId: row.bookingId,
                status: 'error',
                error: `Booking status must be ${BOOKING_STATUS.COMPLETED}, current status: ${booking.status}`,
              });
              continue;
            }

            // Check for duplicate report (same booking already has a report)
            const existingReport = await Document.findOne(
              { bookingId: booking._id, uploadedBy: labUserId, isActive: true },
              {},
              { session }
            );

            if (existingReport) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                bookingId: row.bookingId,
                status: 'error',
                error: 'Report already exists for this booking',
              });
              continue;
            }

            // Create Document record with bookingId
            const documentId = Document.generateDocumentId();
            const document = new Document({
              documentId,
              patientId: booking.patientId._id,
              bookingId: booking._id,
              uploadedBy: labUserId,
              uploadSource: DOCUMENT_UPLOAD_SOURCE.PROVIDER_SUBMISSION,
              documentType: DOCUMENT_TYPES.LAB_REPORT,
              title: row.reportTitle,
              description: row.reportDescription || '',
              fileUrl: row.reportUrl,
              publicId: `lab-report-${documentId}`, // Placeholder for Cloudinary public ID
              metadata: {
                testType: booking.metadata?.testType || booking.metadata?.type || 'Lab Test',
              },
            });

            await document.save({ session });

            // Send patient notification email (ensure booking has patientSnapshot for email template)
            const patientEmail = booking.patientId?.email;
            if (patientEmail) {
              // Create a snapshot with patient details for the email template
              const bookingWithSnapshot = {
                ...booking.toObject(),
                patientSnapshot: {
                  name: booking.patientId?.name || booking.patientId?.displayName || 'Patient',
                  phone: booking.patientSnapshot?.phone,
                },
              };
              await sendLabReportNotificationEmail(
                patientEmail,
                bookingWithSnapshot,
                row.reportTitle,
                labName
              );
            }

            results.successCount++;
            results.details.push({
              rowNumber,
              bookingId: row.bookingId,
              status: 'success',
              message: 'Report uploaded successfully',
              documentId,
            });
          } catch (rowError) {
            results.failureCount++;
            results.details.push({
              rowNumber,
              bookingId: row.bookingId || 'N/A',
              status: 'error',
              error: rowError.message || 'Unknown error processing row',
            });
          }
        }
      });
    } catch (transactionError) {
      console.error('Transaction error during bulk upload:', transactionError);
      return errorResponse(res, `Transaction failed: ${transactionError.message}`, 500);
    }

    return successResponse(res, results, `Bulk upload completed: ${results.successCount} success, ${results.failureCount} failures`);
  } catch (error) {
    console.error('Bulk upload error:', error);
    return errorResponse(res, 'Failed to process bulk upload', 500);
  }
};
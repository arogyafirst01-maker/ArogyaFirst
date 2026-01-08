import User from '../models/User.model.js';
import Prescription from '../models/Prescription.model.js';
import Invoice from '../models/Invoice.model.js';
import { successResponse, errorResponse } from '../utils/response.util.js';
import { updateUserSettings } from '../utils/settings.util.js';
import { generateCSV, generatePDF, formatDateForExport, sanitizeFilename, formatCurrency } from '../utils/export.util.js';
import { ROLES, PRESCRIPTION_STATUS, INVOICE_STATUS, PO_STATUS } from '@arogyafirst/shared';
import { parse } from 'csv-parse/sync';
import { withTransaction } from '../utils/transaction.util.js';
import { sendPOApprovalEmail, sendPOReceivedEmail, sendPOCancelledEmail } from '../utils/email.util.js';

export const getAllPharmacies = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const skip = parseInt(req.query.skip) || 0;
    
    // Find all active pharmacies
    const pharmacies = await User.find({
      role: ROLES.PHARMACY,
      isActive: true
    })
      .select('_id email uniqueId pharmacyData')
      .skip(skip)
      .limit(limit)
      .sort({ 'pharmacyData.name': 1 });

    return successResponse(res, { pharmacies }, 'Pharmacies retrieved successfully');
  } catch (error) {
    console.error('Error fetching pharmacies:', error);
    return errorResponse(res, error.message || 'Failed to fetch pharmacies', 500);
  }
};

export const getProfile = async (req, res) => {
  try {
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Access denied: Pharmacy role required', 403);
    }
    // Build sanitized profile to match /api/auth/me
    const profile = {
      _id: req.user._id,
      email: req.user.email,
      role: req.user.role,
      uniqueId: req.user.uniqueId,
      verificationStatus: req.user.verificationStatus,
      isActive: req.user.isActive,
      pharmacyData: req.user.pharmacyData
    };
    return successResponse(res, { user: profile }, 'Profile retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve profile', 500);
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, location, licenseNumber } = req.body;
    const user = await User.findById(userId);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    if (name !== undefined) user.pharmacyData.name = name;
    if (location !== undefined) user.pharmacyData.location = location;
    if (licenseNumber !== undefined) user.pharmacyData.licenseNumber = licenseNumber;
    await user.save();
    // Sanitize profile to match /api/auth/me shape
    const profile = {
      _id: user._id,
      email: user.email,
      role: user.role,
      uniqueId: user.uniqueId,
      verificationStatus: user.verificationStatus,
      isActive: user.isActive,
      pharmacyData: user.pharmacyData
    };
    return successResponse(res, { user: profile }, 'Profile updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update profile', 500);
  }
};

export const getMedicines = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    // Map to include originalIndex before filtering/sorting so clients can safely mutate
    const raw = Array.isArray(user.pharmacyData?.medicines) ? user.pharmacyData.medicines : [];
    const mapped = raw.map((m, i) => {
      const obj = m && m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
      obj.originalIndex = i;
      return obj;
    });
    let medicines = mapped;
    const { activeOnly, lowStock, expiringSoon } = req.query;
    if (activeOnly === 'true') {
      medicines = medicines.filter(m => m.isActive);
    }
    if (lowStock === 'true') {
      medicines = medicines.filter(m => m.stock <= m.reorderLevel && m.isActive);
    }
    if (expiringSoon === 'true') {
      const now = new Date();
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      // Include only items that are not already expired and will expire within 30 days
      medicines = medicines.filter(m => m.expiryDate && m.expiryDate >= now && m.expiryDate <= thirtyDaysFromNow && m.isActive);
    }
    medicines.sort((a, b) => a.name.localeCompare(b.name));
    return successResponse(res, { medicines }, 'Medicines retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve medicines', 500);
  }
};

export const addMedicine = async (req, res) => {
  try {
    const { name, genericName, manufacturer, stock, reorderLevel, price, batchNumber, expiryDate } = req.body;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    // Normalize name and batchNumber for duplicate checks and storage
    // Only normalize for search, keep original case for storage
    const normalizedName = name ? name.trim().toLowerCase() : '';
    const normalizedBatch = batchNumber ? batchNumber.trim().toLowerCase() : undefined;
    const existing = user.pharmacyData.medicines.find(m => {
      return m.isActive && m.nameNormalized === normalizedName && m.batchNumberNormalized === normalizedBatch;
    });
    if (existing) {
      return errorResponse(res, 'Medicine with same name and batch number already exists', 400);
    }
    const medicine = {
      name: name.trim(),
      nameNormalized: normalizedName,
      genericName,
      manufacturer,
      stock,
      reorderLevel,
      price,
      batchNumber: batchNumber ? batchNumber.trim() : undefined,
      batchNumberNormalized: normalizedBatch,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      isActive: true,
      addedAt: new Date()
    };
    user.pharmacyData.medicines.push(medicine);
    user.markModified('pharmacyData.medicines');
    await user.save();
    return successResponse(res, {
      item: medicine,
      index: user.pharmacyData.medicines.length - 1
    }, 'Medicine added successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to add medicine', 500);
  }
};

export const updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const medicineIdx = user.pharmacyData.medicines.findIndex(m => m._id.toString() === id);
    if (medicineIdx === -1) {
      return errorResponse(res, 'Medicine not found', 404);
    }
    const updates = req.body || {};
    const allowed = ['name', 'genericName', 'manufacturer', 'stock', 'reorderLevel', 'price', 'batchNumber', 'expiryDate', 'isActive'];
    const assigned = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(updates, key)) {
        if (key === 'expiryDate') {
          assigned[key] = updates[key] ? new Date(updates[key]) : undefined;
        } else if (key === 'name' && updates[key]) {
          assigned[key] = String(updates[key]).trim();
          assigned.nameNormalized = String(updates[key]).trim().toLowerCase();
        } else if (key === 'batchNumber' && updates[key]) {
          assigned[key] = String(updates[key]).trim();
          assigned.batchNumberNormalized = String(updates[key]).trim().toLowerCase();
        } else {
          assigned[key] = updates[key];
        }
      }
    }
    Object.assign(user.pharmacyData.medicines[medicineIdx], assigned);
    user.markModified('pharmacyData.medicines');
    await user.save();
    return successResponse(res, {
      item: user.pharmacyData.medicines[medicineIdx],
      index: medicineIdx
    }, 'Medicine updated successfully');
  } catch (error) {
    if (error.name === 'ValidationError') {
      return errorResponse(res, 'Validation failed', 400, Object.values(error.errors).map(e => e.message));
    }
    return errorResponse(res, 'Failed to update medicine', 500);
  }
};

export const deleteMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const medicine = user.pharmacyData.medicines.id(id);
    if (!medicine) {
      return errorResponse(res, 'Medicine not found', 404);
    }
    medicine.isActive = false;
    user.markModified('pharmacyData.medicines');
    await user.save();
    return successResponse(res, null, 'Medicine deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete medicine', 500);
  }
};

export const bulkUploadMedicines = async (req, res) => {
  try {
    // Validate that CSV file is provided
    if (!req.file) {
      return errorResponse(res, 'CSV file is required', 400);
    }

    const pharmacyUserId = req.user._id;

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

    // Validate user before transaction
    const userCheck = await User.findById(pharmacyUserId);
    if (!userCheck || userCheck.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      details: [],
    };

    // Process records within a transaction for atomicity
    try {
      await withTransaction(async (session) => {
        const user = await User.findById(pharmacyUserId).session(session);

        for (let rowIndex = 0; rowIndex < records.length; rowIndex++) {
          const row = records[rowIndex];
          const rowNumber = rowIndex + 2; // +2 to account for header and 1-based indexing

          try {
            // Validate required fields
            if (!row.name || row.stock === undefined || row.stock === '' || row.reorderLevel === undefined || row.reorderLevel === '' || row.price === undefined || row.price === '') {
              results.failureCount++;
              results.details.push({
                rowNumber,
                medicineName: row.name || 'N/A',
                status: 'error',
                error: 'Missing required fields: name, stock, reorderLevel, price',
              });
              continue;
            }

            // Validate data types - stock, reorderLevel, price must be numbers >= 0
            const stock = parseFloat(row.stock);
            const reorderLevel = parseFloat(row.reorderLevel);
            const price = parseFloat(row.price);

            if (isNaN(stock) || stock < 0) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                medicineName: row.name,
                status: 'error',
                error: 'Stock must be a non-negative number',
              });
              continue;
            }

            if (isNaN(reorderLevel) || reorderLevel < 0) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                medicineName: row.name,
                status: 'error',
                error: 'Reorder level must be a non-negative number',
              });
              continue;
            }

            if (isNaN(price) || price < 0) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                medicineName: row.name,
                status: 'error',
                error: 'Price must be a non-negative number',
              });
              continue;
            }

            // Validate expiry date if provided
            let expiryDate = null;
            if (row.expiryDate && row.expiryDate.trim() !== '') {
              const parsedDate = new Date(row.expiryDate);
              if (isNaN(parsedDate.getTime())) {
                results.failureCount++;
                results.details.push({
                  rowNumber,
                  medicineName: row.name,
                  status: 'error',
                  error: 'Invalid expiry date format',
                });
                continue;
              }

              if (parsedDate < new Date()) {
                results.failureCount++;
                results.details.push({
                  rowNumber,
                  medicineName: row.name,
                  status: 'error',
                  error: 'Expiry date must be in the future',
                });
                continue;
              }

              expiryDate = parsedDate;
            }

            // Normalize name and batch number for duplicate check
            const nameNormalized = row.name.trim().toLowerCase();
            const batchNumberNormalized = row.batchNumber ? row.batchNumber.trim().toLowerCase() : undefined;

            // Check for duplicate medicine with same nameNormalized + batchNumberNormalized
            const duplicate = user.pharmacyData.medicines.find(
              m => m.isActive && m.nameNormalized === nameNormalized && m.batchNumberNormalized === batchNumberNormalized
            );

            if (duplicate) {
              results.failureCount++;
              results.details.push({
                rowNumber,
                medicineName: row.name,
                status: 'error',
                error: 'Medicine with this name and batch number already exists',
              });
              continue;
            }

            // Create medicine object
            const medicine = {
              name: row.name,
              nameNormalized,
              genericName: row.genericName || '',
              manufacturer: row.manufacturer || '',
              stock: parseInt(stock, 10),
              reorderLevel: parseInt(reorderLevel, 10),
              price: parseFloat(price),
              batchNumber: row.batchNumber || undefined,
              batchNumberNormalized,
              expiryDate,
              isActive: true,
              addedAt: new Date(),
            };

            // Push medicine to array
            user.pharmacyData.medicines.push(medicine);

            results.successCount++;
            results.details.push({
              rowNumber,
              medicineName: row.name,
              status: 'success',
              message: 'Medicine uploaded successfully',
            });
          } catch (rowError) {
            results.failureCount++;
            results.details.push({
              rowNumber,
              medicineName: row.name || 'N/A',
              status: 'error',
              error: rowError.message || 'Unknown error processing row',
            });
          }
        }

        // Mark modified and save after all records processed
        user.markModified('pharmacyData.medicines');
        await user.save({ session });
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

export const getLowStockMedicines = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const raw = Array.isArray(user.pharmacyData?.medicines) ? user.pharmacyData.medicines : [];
    const mapped = raw.map((m, i) => {
      const obj = m && m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
      obj.originalIndex = i;
      return obj;
    });
    const lowStockMedicines = mapped
      .filter(m => m.stock <= m.reorderLevel && m.isActive)
      .sort((a, b) => a.stock - b.stock);
    return successResponse(res, { medicines: lowStockMedicines }, 'Low stock medicines retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve low stock medicines', 500);
  }
};

export const getExpiringMedicines = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }
    const now = new Date();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const raw = Array.isArray(user.pharmacyData?.medicines) ? user.pharmacyData.medicines : [];
    const mapped = raw.map((m, i) => {
      const obj = m && m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
      obj.originalIndex = i;
      return obj;
    });
    const expiringMedicines = mapped
      .filter(m => m.expiryDate && m.expiryDate >= now && m.expiryDate <= thirtyDaysFromNow && m.isActive)
      .sort((a, b) => a.expiryDate - b.expiryDate);
    return successResponse(res, { medicines: expiringMedicines }, 'Expiring medicines retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve expiring medicines', 500);
  }
};

export const getDashboard = async (req, res) => {
  try {
    const pharmacyId = req.params.id;
    const userId = req.user._id;
    
    // Verify authorization
    if (pharmacyId !== userId.toString() && req.user.role !== ROLES.ADMIN) {
      return errorResponse(res, 'Forbidden: You can only access your own dashboard', 403);
    }
    
    // Verify user is a pharmacy
    const pharmacy = await User.findById(pharmacyId);
    if (!pharmacy || pharmacy.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Pharmacy not found', 404);
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
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Get prescription metrics using aggregation
    const metricsAgg = await Prescription.aggregate([
      {
        $match: {
          pharmacyId: pharmacy._id
        }
      },
      {
        $facet: {
          // Total prescriptions in the period
          monthlyPrescriptions: [
            { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
            { $count: 'count' }
          ],
          // Pending prescriptions
          pendingPrescriptions: [
            {
              $match: {
                status: PRESCRIPTION_STATUS.PENDING,
                createdAt: { $gte: rangeStart, $lte: rangeEnd }
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
          // Prescriptions over time (last 30 days, grouped by day)
          prescriptionsOverTime: [
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
    
    // Get pending prescriptions queue
    const pendingPrescriptions = await Prescription.find({
      pharmacyId,
      status: { $in: [PRESCRIPTION_STATUS.PENDING, PRESCRIPTION_STATUS.APPROVED] }
    })
      .populate('patientId', 'name phone email')
      .populate('doctorId', 'name')
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();
    
    // Get recent fulfilled prescriptions
    const recentFulfilledPrescriptions = await Prescription.find({
      pharmacyId,
      status: PRESCRIPTION_STATUS.FULFILLED
    })
      .populate('patientId', 'name phone email')
      .sort({ fulfilledAt: -1 })
      .limit(10)
      .lean();
    
    // Get inventory alerts from pharmacy medicines
    const raw = Array.isArray(pharmacy.pharmacyData?.medicines) ? pharmacy.pharmacyData.medicines : [];
    const lowStockMedicines = raw
      .filter(m => m.isActive && m.stock <= m.reorderLevel)
      .map((m) => {
        const obj = m && m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
        return {
          _id: obj._id,
          medicineName: obj.name,
          currentStock: obj.stock,
          reorderLevel: obj.reorderLevel,
          expiryDate: obj.expiryDate,
        };
      })
      .sort((a, b) => a.currentStock - b.currentStock);
    
    const expiringMedicines = raw
      .filter(m => m.isActive && m.expiryDate && m.expiryDate >= now && m.expiryDate <= thirtyDaysFromNow)
      .map((m) => {
        const obj = m && m.toObject ? m.toObject() : JSON.parse(JSON.stringify(m));
        return {
          _id: obj._id,
          medicineName: obj.name,
          currentStock: obj.stock,
          reorderLevel: obj.reorderLevel,
          expiryDate: obj.expiryDate,
        };
      })
      .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
    
    // Get revenue from paid invoices
    const revenueAgg = await Invoice.aggregate([
      {
        $match: {
          providerId: pharmacy._id,
          status: INVOICE_STATUS.PAID,
          invoiceDate: { $gte: rangeStart, $lte: rangeEnd }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    // Format response
    const dashboard = {
      metrics: {
        totalPrescriptionsThisMonth: metrics.monthlyPrescriptions[0]?.count || 0,
        revenueThisMonth: revenueAgg[0]?.total || 0,
        pendingPrescriptions: metrics.pendingPrescriptions[0]?.count || 0,
        lowStockCount: lowStockMedicines.length,
        expiringCount: expiringMedicines.length,
        statusBreakdown: metrics.statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {})
      },
      prescriptionsOverTime: metrics.prescriptionsOverTime,
      pendingPrescriptions,
      recentFulfilledPrescriptions,
      inventoryAlerts: {
        lowStock: lowStockMedicines.slice(0, 10), // Top 10 low stock
        expiring: expiringMedicines.slice(0, 10) // Top 10 expiring soon
      }
    };
    
    return successResponse(res, { dashboard }, 'Dashboard data retrieved successfully');
  } catch (error) {
    console.error('Get pharmacy dashboard error:', error);
    return errorResponse(res, error.message || 'Failed to retrieve dashboard data', 500);
  }
};

export const exportReport = async (req, res) => {
  try {
    // Authorization: Allow PHARMACY owner or ADMIN
    const { id } = req.params;
    const isPharmacyOwner = req.user.role === ROLES.PHARMACY && id === req.user._id.toString();
    const isAdmin = req.user.role === ROLES.ADMIN;
    
    if (!isPharmacyOwner && !isAdmin) {
      return errorResponse(res, 'Access denied', 403);
    }

    // Extract and validate parameters
    const { reportType, format, startDate, endDate } = req.query;
    
    if (!reportType || !['prescriptions', 'inventory', 'revenue'].includes(reportType)) {
      return errorResponse(res, 'Invalid report type. Allowed: prescriptions, inventory, revenue', 400);
    }
    
    if (!format || !['csv', 'pdf'].includes(format)) {
      return errorResponse(res, 'Invalid format. Allowed: csv, pdf', 400);
    }
    
    // Inventory doesn't require date range
    if (reportType !== 'inventory' && (!startDate || !endDate)) {
      return errorResponse(res, 'startDate and endDate are required for this report type', 400);
    }
    
    let start, end;
    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return errorResponse(res, 'Invalid date format. Use ISO date strings', 400);
      }
    }
    
    // For ADMIN, use the pharmacy ID from params; for PHARMACY owner, use their own ID
    const pharmacyId = req.user.role === ROLES.ADMIN ? id : req.user._id;
    let data = [];
    let fields = [];
    let columns = [];
    let title = '';
    
    switch (reportType) {
      case 'prescriptions': {
        title = 'Prescriptions Report';
        const prescriptions = await Prescription.find({
          pharmacyId,
          createdAt: { $gte: start, $lte: end }
        })
          .populate('patientId', 'name patientData.name')
          .populate('doctorId', 'name doctorData.name')
          .lean();
        
        // Get invoices for these prescriptions
        const prescriptionIds = prescriptions.map(p => p._id);
        const invoices = await Invoice.find({
          prescriptionId: { $in: prescriptionIds }
        }).lean();
        const invoiceMap = new Map(invoices.map(i => [i.prescriptionId.toString(), i]));
        
        data = prescriptions.map(p => ({
          prescriptionId: p.prescriptionId || p._id.toString().slice(-8).toUpperCase(),
          patientName: p.patientId?.patientData?.name || p.patientId?.name || 'N/A',
          doctorName: p.doctorId?.doctorData?.name || p.doctorId?.name || 'N/A',
          date: formatDateForExport(p.createdAt),
          status: p.status,
          medicinesCount: p.medicines?.length || 0,
          totalAmount: invoiceMap.get(p._id.toString())?.totalAmount || 0
        }));
        
        fields = [
          { label: 'Prescription ID', value: 'prescriptionId' },
          { label: 'Patient Name', value: 'patientName' },
          { label: 'Doctor Name', value: 'doctorName' },
          { label: 'Date', value: 'date' },
          { label: 'Status', value: 'status' },
          { label: 'Medicines Count', value: 'medicinesCount' },
          { label: 'Total Amount (₹)', value: 'totalAmount' }
        ];
        
        columns = [
          { header: 'Prescription ID', key: 'prescriptionId', width: 70 },
          { header: 'Patient', key: 'patientName', width: 80 },
          { header: 'Doctor', key: 'doctorName', width: 80 },
          { header: 'Date', key: 'date', width: 65 },
          { header: 'Status', key: 'status', width: 60 },
          { header: 'Medicines', key: 'medicinesCount', width: 50 },
          { header: 'Amount', key: 'totalAmount', width: 60, isCurrency: true }
        ];
        break;
      }
      
      case 'inventory': {
        title = 'Inventory Report';
        const pharmacy = await User.findById(pharmacyId);
        const medicines = pharmacy?.pharmacyData?.medicines || [];
        
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        data = medicines
          .filter(m => m.isActive)
          .map(m => {
            let status = 'Normal';
            if (m.stock <= m.reorderLevel) {
              status = 'Low Stock';
            } else if (m.expiryDate && new Date(m.expiryDate) <= thirtyDaysFromNow) {
              status = 'Expiring Soon';
            }
            
            return {
              medicineName: m.name,
              genericName: m.genericName || 'N/A',
              manufacturer: m.manufacturer || 'N/A',
              currentStock: m.stock,
              reorderLevel: m.reorderLevel,
              price: m.price || 0,
              batchNumber: m.batchNumber || 'N/A',
              expiryDate: formatDateForExport(m.expiryDate),
              status
            };
          });
        
        fields = [
          { label: 'Medicine Name', value: 'medicineName' },
          { label: 'Generic Name', value: 'genericName' },
          { label: 'Manufacturer', value: 'manufacturer' },
          { label: 'Current Stock', value: 'currentStock' },
          { label: 'Reorder Level', value: 'reorderLevel' },
          { label: 'Price (₹)', value: 'price' },
          { label: 'Batch Number', value: 'batchNumber' },
          { label: 'Expiry Date', value: 'expiryDate' },
          { label: 'Status', value: 'status' }
        ];
        
        columns = [
          { header: 'Medicine', key: 'medicineName', width: 80 },
          { header: 'Generic', key: 'genericName', width: 60 },
          { header: 'Manufacturer', key: 'manufacturer', width: 60 },
          { header: 'Stock', key: 'currentStock', width: 35 },
          { header: 'Reorder', key: 'reorderLevel', width: 40 },
          { header: 'Price', key: 'price', width: 40, isCurrency: true },
          { header: 'Batch', key: 'batchNumber', width: 50 },
          { header: 'Expiry', key: 'expiryDate', width: 55 },
          { header: 'Status', key: 'status', width: 55 }
        ];
        break;
      }
      
      case 'revenue': {
        title = 'Revenue Report';
        const revenueAgg = await Invoice.aggregate([
          {
            $match: {
              pharmacyId,
              status: INVOICE_STATUS.PAID,
              createdAt: { $gte: start, $lte: end }
            }
          },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              totalPrescriptions: { $sum: 1 },
              totalRevenue: { $sum: '$totalAmount' }
            }
          },
          { $sort: { _id: 1 } }
        ]);
        
        data = revenueAgg.map(r => ({
          date: formatDateForExport(new Date(r._id)),
          totalPrescriptions: r.totalPrescriptions,
          totalRevenue: r.totalRevenue,
          averageValue: r.totalPrescriptions > 0 ? Math.round(r.totalRevenue / r.totalPrescriptions) : 0
        }));
        
        fields = [
          { label: 'Date', value: 'date' },
          { label: 'Prescriptions Fulfilled', value: 'totalPrescriptions' },
          { label: 'Total Revenue (₹)', value: 'totalRevenue' },
          { label: 'Average Value (₹)', value: 'averageValue' }
        ];
        
        columns = [
          { header: 'Date', key: 'date', width: 100 },
          { header: 'Prescriptions', key: 'totalPrescriptions', width: 100 },
          { header: 'Total Revenue', key: 'totalRevenue', width: 100, isCurrency: true },
          { header: 'Avg Value', key: 'averageValue', width: 100, isCurrency: true }
        ];
        break;
      }
    }
    
    // Generate export
    const dateRangeStr = start && end ? `${formatDateForExport(start)} to ${formatDateForExport(end)}` : 'Current Inventory';
    const filename = sanitizeFilename(`pharmacy_${reportType}_${Date.now()}`);
    
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
    if (req.user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'Access denied: Pharmacy role required', 403);
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
      expectedRole: ROLES.PHARMACY,
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

// ==================== SUPPLIER MANAGEMENT ====================

export const getSuppliers = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const suppliers = user.pharmacyData.suppliers;
    const activeOnly = req.query.activeOnly === 'true';
    
    const filtered = activeOnly ? suppliers.filter(s => s.isActive) : suppliers;
    const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));

    return successResponse(res, { suppliers: sorted }, 'Suppliers retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve suppliers', 500);
  }
};

export const addSupplier = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const supplier = {
      name: req.body.name,
      contactPerson: req.body.contactPerson || '',
      phone: req.body.phone,
      email: req.body.email || '',
      address: req.body.address || '',
      gstin: req.body.gstin || '',
      isActive: true,
      addedAt: new Date()
    };

    user.pharmacyData.suppliers.push(supplier);
    user.markModified('pharmacyData.suppliers');
    await user.save();

    return successResponse(res, { supplier }, 'Supplier added successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to add supplier', 500);
  }
};

export const updateSupplier = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const supplier = user.pharmacyData.suppliers.id(req.params.id);
    if (!supplier) {
      return errorResponse(res, 'Supplier not found', 404);
    }

    const allowedFields = ['name', 'contactPerson', 'phone', 'email', 'address', 'gstin', 'isActive'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        supplier[field] = req.body[field];
      }
    });

    user.markModified('pharmacyData.suppliers');
    await user.save();

    return successResponse(res, { supplier }, 'Supplier updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update supplier', 500);
  }
};

export const deleteSupplier = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const supplier = user.pharmacyData.suppliers.id(req.params.id);
    if (!supplier) {
      return errorResponse(res, 'Supplier not found', 404);
    }

    supplier.isActive = false;
    user.markModified('pharmacyData.suppliers');
    await user.save();

    return successResponse(res, null, 'Supplier deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete supplier', 500);
  }
};

// ==================== PURCHASE ORDER MANAGEMENT ====================

export const getPurchaseOrders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    let pos = user.pharmacyData.purchaseOrders || [];

    // Filter by status
    if (req.query.status) {
      pos = pos.filter(po => po.status === req.query.status);
    }

    // Filter by supplier (normalize ObjectId for comparison)
    if (req.query.supplierId) {
      const normalizedSupplierId = String(req.query.supplierId);
      pos = pos.filter(po => String(po.supplierId || '') === normalizedSupplierId);
    }

    // Filter by date range
    if (req.query.startDate || req.query.endDate) {
      const start = req.query.startDate ? new Date(req.query.startDate) : new Date(0);
      const end = req.query.endDate ? new Date(req.query.endDate) : new Date();
      pos = pos.filter(po => new Date(po.orderDate) >= start && new Date(po.orderDate) <= end);
    }

    // Sort by orderDate descending
    pos = pos.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));

    return successResponse(res, { purchaseOrders: pos }, 'Purchase orders retrieved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to retrieve purchase orders', 500);
  }
};

export const createPurchaseOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const supplier = user.pharmacyData.suppliers.id(req.body.supplierId);
    if (!supplier) {
      return errorResponse(res, 'Supplier not found', 404);
    }

    const poNumber = `PO${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

    const items = req.body.items.map(item => ({
      medicineName: item.medicineName,
      genericName: item.genericName || '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.quantity * item.unitPrice,
      batchNumber: item.batchNumber || undefined,
      expiryDate: item.expiryDate || null,
      quantityReceived: 0
    }));

    const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);

    const po = {
      poNumber,
      supplierId: req.body.supplierId,
      supplierSnapshot: {
        name: supplier.name,
        phone: supplier.phone,
        email: supplier.email
      },
      items,
      totalAmount,
      status: PO_STATUS.PENDING,
      orderDate: new Date(),
      expectedDeliveryDate: req.body.expectedDeliveryDate || null,
      notes: req.body.notes || '',
      statusHistory: [{
        status: PO_STATUS.PENDING,
        timestamp: new Date(),
        updatedBy: user.name || 'System',
        notes: 'PO created'
      }],
      createdAt: new Date()
    };

    user.pharmacyData.purchaseOrders.push(po);
    user.markModified('pharmacyData.purchaseOrders');
    await user.save();

    return successResponse(res, { purchaseOrder: po }, 'Purchase order created successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to create purchase order', 500);
  }
};

export const updatePurchaseOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const po = user.pharmacyData.purchaseOrders.id(req.params.id);
    if (!po) {
      return errorResponse(res, 'Purchase order not found', 404);
    }

    if (po.status !== PO_STATUS.PENDING && po.status !== PO_STATUS.APPROVED) {
      return errorResponse(res, 'Only PENDING or APPROVED POs can be updated', 400);
    }

    const allowedFields = ['items', 'expectedDeliveryDate', 'notes'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'items') {
          po[field] = req.body[field].map(item => ({
            medicineName: item.medicineName,
            genericName: item.genericName || '',
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            batchNumber: item.batchNumber || undefined,
            expiryDate: item.expiryDate || null,
            quantityReceived: item.quantityReceived || 0
          }));
          po.totalAmount = po.items.reduce((sum, i) => sum + i.totalPrice, 0);
        } else {
          po[field] = req.body[field];
        }
      }
    });

    user.markModified('pharmacyData.purchaseOrders');
    await user.save();

    return successResponse(res, { purchaseOrder: po }, 'Purchase order updated successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to update purchase order', 500);
  }
};

export const approvePurchaseOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const po = user.pharmacyData.purchaseOrders.id(req.params.id);
    if (!po) {
      return errorResponse(res, 'Purchase order not found', 404);
    }

    if (po.status !== PO_STATUS.PENDING) {
      return errorResponse(res, 'Only PENDING POs can be approved', 400);
    }

    po.status = PO_STATUS.APPROVED;
    po.approvedBy = req.body.approvedBy;
    po.approvedAt = new Date();
    po.statusHistory.push({
      status: PO_STATUS.APPROVED,
      timestamp: new Date(),
      updatedBy: user.name || 'System',
      notes: req.body.notes || 'PO approved'
    });

    user.markModified('pharmacyData.purchaseOrders');
    await user.save();

    const supplier = user.pharmacyData.suppliers.id(po.supplierId);
    if (supplier && supplier.email) {
      await sendPOApprovalEmail(supplier.email, po, user.pharmacyData.name);
    }

    return successResponse(res, { purchaseOrder: po }, 'Purchase order approved successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to approve purchase order', 500);
  }
};

export const receivePurchaseOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const po = user.pharmacyData.purchaseOrders.id(req.params.id);
    if (!po) {
      return errorResponse(res, 'Purchase order not found', 404);
    }

    if (po.status !== PO_STATUS.APPROVED && po.status !== PO_STATUS.PARTIAL) {
      return errorResponse(res, 'Only APPROVED or PARTIAL POs can receive items', 400);
    }

    // Validate receipt items before transaction (Comment 4)
    for (const itemData of req.body.items) {
      if (!Number.isInteger(itemData.itemIndex) || itemData.itemIndex < 0 || itemData.itemIndex >= po.items.length) {
        return errorResponse(res, `Invalid item index: ${itemData.itemIndex}`, 400);
      }
      
      const poItem = po.items[itemData.itemIndex];
      if (!Number.isInteger(itemData.quantityReceived) || itemData.quantityReceived <= 0) {
        return errorResponse(res, `Quantity received must be positive for item: ${poItem.medicineName}`, 400);
      }
      
      const totalReceivedAfter = poItem.quantityReceived + itemData.quantityReceived;
      if (totalReceivedAfter > poItem.quantity) {
        return errorResponse(res, `Over-receipt detected for item: ${poItem.medicineName}. Max allowed: ${poItem.quantity - poItem.quantityReceived}, provided: ${itemData.quantityReceived}`, 400);
      }
    }

    await withTransaction(async (session) => {
      // Fetch sessionUser and sessionPo inside transaction (Comment 2)
      const sessionUser = await User.findById(req.user._id).session(session);
      const sessionPo = sessionUser.pharmacyData.purchaseOrders.id(req.params.id);

      if (!sessionPo) {
        throw new Error('Purchase order not found in transaction');
      }

      // Update quantities received
      for (const itemData of req.body.items) {
        const poItem = sessionPo.items[itemData.itemIndex];
        if (poItem) {
          poItem.quantityReceived += itemData.quantityReceived;
        }
      }

      // Check if fully received
      const allReceived = sessionPo.items.every(item => item.quantityReceived >= item.quantity);

      sessionPo.status = allReceived ? PO_STATUS.COMPLETED : PO_STATUS.PARTIAL;
      if (allReceived) {
        sessionPo.receivedAt = new Date();
      }

      sessionPo.statusHistory.push({
        status: sessionPo.status,
        timestamp: new Date(),
        updatedBy: req.body.receivedBy,
        notes: req.body.notes || 'Items received'
      });

      // Update medicine stock with normalized field lookup (Comment 5)
      for (const item of sessionPo.items) {
        if (item.quantityReceived > 0) {
          const nameNormalized = item.medicineName.trim().toLowerCase();
          const batchNumberNormalized = item.batchNumber ? item.batchNumber.trim().toLowerCase() : undefined;

          let medicine = sessionUser.pharmacyData.medicines.find(m =>
            m.nameNormalized === nameNormalized &&
            (m.batchNumberNormalized === batchNumberNormalized || (!m.batchNumberNormalized && !batchNumberNormalized))
          );

          if (medicine) {
            medicine.stock += item.quantityReceived;
          }
        }
      }

      sessionUser.markModified('pharmacyData.purchaseOrders');
      sessionUser.markModified('pharmacyData.medicines');
      await sessionUser.save({ session });
    });

    // Reload user and po from database after transaction (Comment 8)
    const freshUser = await User.findById(req.user._id);
    const freshPo = freshUser.pharmacyData.purchaseOrders.id(req.params.id);
    
    // Send email with fresh data
    const supplier = freshUser.pharmacyData.suppliers.id(freshPo.supplierId);
    if (supplier && supplier.email) {
      await sendPOReceivedEmail(supplier.email, freshPo, freshUser.pharmacyData.name, req.body.items);
    }

    return successResponse(res, { purchaseOrder: freshPo }, 'Purchase order items received successfully');
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    return errorResponse(res, 'Failed to receive purchase order items', 500);
  }
};

export const cancelPurchaseOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const po = user.pharmacyData.purchaseOrders.id(req.params.id);
    if (!po) {
      return errorResponse(res, 'Purchase order not found', 404);
    }

    if (po.status !== PO_STATUS.PENDING && po.status !== PO_STATUS.APPROVED) {
      return errorResponse(res, 'Only PENDING or APPROVED POs can be cancelled', 400);
    }

    po.status = PO_STATUS.CANCELLED;
    po.statusHistory.push({
      status: PO_STATUS.CANCELLED,
      timestamp: new Date(),
      updatedBy: user.name || 'System',
      notes: req.body.reason || 'PO cancelled'
    });

    user.markModified('pharmacyData.purchaseOrders');
    await user.save();

    const supplier = user.pharmacyData.suppliers.id(po.supplierId);
    if (supplier && supplier.email) {
      await sendPOCancelledEmail(supplier.email, po, user.pharmacyData.name, req.body.reason);
    }

    return successResponse(res, { purchaseOrder: po }, 'Purchase order cancelled successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to cancel purchase order', 500);
  }
};

export const deletePurchaseOrder = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const po = user.pharmacyData.purchaseOrders.id(req.params.id);
    if (!po) {
      return errorResponse(res, 'Purchase order not found', 404);
    }

    if (po.status !== PO_STATUS.PENDING && po.status !== PO_STATUS.CANCELLED) {
      return errorResponse(res, 'Only PENDING or CANCELLED POs can be deleted', 400);
    }

    user.pharmacyData.purchaseOrders.pull(req.params.id);
    user.markModified('pharmacyData.purchaseOrders');
    await user.save();

    return successResponse(res, null, 'Purchase order deleted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to delete purchase order', 500);
  }
};

export const adjustStock = async (req, res) => {
  try {
    const { medicineId, adjustmentType, quantity, reason, performedBy } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const medicine = user.pharmacyData.medicines.id(medicineId);
    if (!medicine) {
      return errorResponse(res, 'Medicine not found', 404);
    }

    // Calculate new stock
    let newStock = medicine.stock;
    if (adjustmentType === 'ADD') {
      newStock += quantity;
    } else if (adjustmentType === 'SUBTRACT') {
      newStock -= quantity;
      if (newStock < 0) {
        return errorResponse(res, 'Insufficient stock for subtraction', 400);
      }
    } else {
      return errorResponse(res, 'Invalid adjustment type', 400);
    }

    // Add audit trail note
    const adjustmentNote = `Stock ${adjustmentType.toLowerCase()} by ${quantity} units. Reason: ${reason}. Performed by: ${performedBy}. Date: ${new Date().toISOString()}`;
    if (!medicine.notes) {
      medicine.notes = [];
    }
    medicine.notes.push(adjustmentNote);

    // Update stock
    medicine.stock = newStock;
    user.markModified('pharmacyData.medicines');
    await user.save();

    return successResponse(res, { medicine }, 'Stock adjusted successfully');
  } catch (error) {
    return errorResponse(res, 'Failed to adjust stock', 500);
  }
};

export const physicalVerification = async (req, res) => {
  try {
    const { verifications, verifiedBy, autoAdjust } = req.body;

    const user = await User.findById(req.user._id);
    if (!user || user.role !== ROLES.PHARMACY) {
      return errorResponse(res, 'User not found or access denied', 404);
    }

    const summary = {
      totalVerifications: verifications.length,
      discrepancies: 0,
      adjustments: 0,
      details: [],
    };

    for (const verification of verifications) {
      const { medicineId, systemStock, actualStock, notes } = verification;

      const medicine = user.pharmacyData.medicines.id(medicineId);
      if (!medicine) {
        summary.details.push({
          medicineId,
          status: 'error',
          message: 'Medicine not found',
        });
        continue;
      }

      // Calculate discrepancy
      const discrepancy = systemStock - actualStock;

      if (discrepancy !== 0) {
        summary.discrepancies++;

        // Add verification note
        const verificationNote = `Physical verification discrepancy: System stock ${systemStock}, Actual stock ${actualStock}. Discrepancy: ${discrepancy} units. Notes: ${notes}. Verified by: ${verifiedBy}. Date: ${new Date().toISOString()}`;
        if (!medicine.notes) {
          medicine.notes = [];
        }
        medicine.notes.push(verificationNote);

        // Auto-adjust if requested
        if (autoAdjust) {
          medicine.stock = actualStock;
          summary.adjustments++;
        }
      }

      summary.details.push({
        medicineId,
        medicineName: medicine.name,
        discrepancy,
        adjusted: autoAdjust && discrepancy !== 0,
        status: 'success',
      });
    }

    if (summary.discrepancies > 0) {
      user.markModified('pharmacyData.medicines');
      await user.save();
    }

    return successResponse(res, summary, 'Physical verification completed');
  } catch (error) {
    return errorResponse(res, 'Failed to complete physical verification', 500);
  }
};
import mongoose from 'mongoose';
import User from '../models/User.model.js';
import { ROLES } from '@arogyafirst/shared';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://arogyafirst01_db_user:jQi8mcB9eYP8FL2r@cluster0.kgrwhjd.mongodb.net/arogyafirst';

async function updateLabMachines() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update Lab 1 - PathLab Diagnostics
    const lab1 = await User.findOne({ email: 'lab1@test.com', role: ROLES.LAB });
    if (lab1) {
      const result1 = await User.updateOne(
        { _id: lab1._id },
        {
          $set: {
            'labData.machines': [
              {
                name: 'MRI Scanner 3T',
                model: 'MAGNETOM Skyra',
                manufacturer: 'Siemens',
                purchaseDate: new Date('2023-01-15'),
                lastMaintenanceDate: new Date('2025-11-01'),
                nextMaintenanceDate: new Date('2026-02-01'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'CT Scanner 64-slice',
                model: 'Revolution CT',
                manufacturer: 'GE Healthcare',
                purchaseDate: new Date('2023-03-20'),
                lastMaintenanceDate: new Date('2025-10-15'),
                nextMaintenanceDate: new Date('2026-01-15'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'Digital X-Ray Machine',
                model: 'DigitalDiagnost C90',
                manufacturer: 'Philips',
                purchaseDate: new Date('2022-11-10'),
                lastMaintenanceDate: new Date('2025-12-01'),
                nextMaintenanceDate: new Date('2026-03-01'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'Ultrasound Machine',
                model: 'EPIQ 7',
                manufacturer: 'Philips',
                purchaseDate: new Date('2023-05-05'),
                lastMaintenanceDate: new Date('2025-11-20'),
                nextMaintenanceDate: new Date('2026-02-20'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'Automated Hematology Analyzer',
                model: 'XN-1000',
                manufacturer: 'Sysmex',
                purchaseDate: new Date('2023-06-12'),
                lastMaintenanceDate: new Date('2025-12-10'),
                nextMaintenanceDate: new Date('2026-01-10'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'Biochemistry Analyzer',
                model: 'AU680',
                manufacturer: 'Beckman Coulter',
                purchaseDate: new Date('2023-02-28'),
                lastMaintenanceDate: new Date('2025-11-15'),
                nextMaintenanceDate: new Date('2026-02-15'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              }
            ]
          }
        }
      );
      console.log(`✅ Updated Lab 1 (PathLab Diagnostics): ${result1.modifiedCount} document(s) modified`);
      console.log('   - Added 6 machines (MRI, CT, X-Ray, Ultrasound, Hematology, Biochemistry)');
    }

    // Update Lab 2 - Metro Diagnostics
    const lab2 = await User.findOne({ email: 'lab2@test.com', role: ROLES.LAB });
    if (lab2) {
      const result2 = await User.updateOne(
        { _id: lab2._id },
        {
          $set: {
            'labData.machines': [
              {
                name: 'Digital X-Ray',
                model: 'DR 600',
                manufacturer: 'Carestream',
                purchaseDate: new Date('2023-04-10'),
                lastMaintenanceDate: new Date('2025-11-25'),
                nextMaintenanceDate: new Date('2026-02-25'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'ECG Machine',
                model: 'MAC 2000',
                manufacturer: 'GE Healthcare',
                purchaseDate: new Date('2022-09-15'),
                lastMaintenanceDate: new Date('2025-12-05'),
                nextMaintenanceDate: new Date('2026-03-05'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'Pathology Analyzer',
                model: 'DxH 800',
                manufacturer: 'Beckman Coulter',
                purchaseDate: new Date('2023-07-20'),
                lastMaintenanceDate: new Date('2025-10-30'),
                nextMaintenanceDate: new Date('2026-01-30'),
                status: 'OPERATIONAL',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              },
              {
                name: 'Blood Gas Analyzer',
                model: 'ABL90 FLEX',
                manufacturer: 'Radiometer',
                purchaseDate: new Date('2023-08-15'),
                lastMaintenanceDate: new Date('2025-11-10'),
                nextMaintenanceDate: new Date('2026-02-10'),
                status: 'MAINTENANCE',
                isActive: true,
                addedAt: new Date(),
                qcRecords: []
              }
            ]
          }
        }
      );
      console.log(`✅ Updated Lab 2 (Metro Diagnostics): ${result2.modifiedCount} document(s) modified`);
      console.log('   - Added 4 machines (X-Ray, ECG, Pathology Analyzer, Blood Gas Analyzer)');
    }

    // Verify the updates
    console.log('\n📋 Verification:');
    const updatedLab1 = await User.findOne({ email: 'lab1@test.com' }).lean();
    const updatedLab2 = await User.findOne({ email: 'lab2@test.com' }).lean();
    
    console.log(`Lab 1 machines count: ${updatedLab1?.labData?.machines?.length || 0}`);
    console.log(`Lab 2 machines count: ${updatedLab2?.labData?.machines?.length || 0}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('✅ Lab machines updated successfully!');

  } catch (error) {
    console.error('❌ Error updating lab machines:', error);
    process.exit(1);
  }
}

updateLabMachines();

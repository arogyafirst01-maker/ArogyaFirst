const mongoose = require('mongoose');
const User = require('../models/User.model.js');
const { ROLES } = require('@arogyafirst/shared');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://arogyafirst01_db_user:jQi8mcB9eYP8FL2r@cluster0.kgrwhjd.mongodb.net/arogyafirst';

async function updatePharmacyData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Update Pharmacy 1 - HealthPlus Pharmacy
    const pharmacy1 = await User.findOne({ email: 'pharmacy1@test.com', role: ROLES.PHARMACY });
    if (pharmacy1) {
      const result1 = await User.updateOne(
        { _id: pharmacy1._id },
        {
          $set: {
            'pharmacyData.medicines': [
              {
                name: 'Paracetamol 500mg',
                nameNormalized: 'paracetamol 500mg',
                genericName: 'Acetaminophen',
                manufacturer: 'Cipla Ltd',
                stock: 500,
                reorderLevel: 100,
                price: 2.50,
                batchNumber: 'PAR2025001',
                batchNumberNormalized: 'par2025001',
                expiryDate: new Date('2026-12-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Amoxicillin 500mg',
                nameNormalized: 'amoxicillin 500mg',
                genericName: 'Amoxicillin',
                manufacturer: 'Sun Pharma',
                stock: 300,
                reorderLevel: 80,
                price: 8.50,
                batchNumber: 'AMX2025002',
                batchNumberNormalized: 'amx2025002',
                expiryDate: new Date('2027-06-30'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Ibuprofen 400mg',
                nameNormalized: 'ibuprofen 400mg',
                genericName: 'Ibuprofen',
                manufacturer: 'Dr. Reddy\'s',
                stock: 450,
                reorderLevel: 100,
                price: 5.00,
                batchNumber: 'IBU2025003',
                batchNumberNormalized: 'ibu2025003',
                expiryDate: new Date('2027-03-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Cetirizine 10mg',
                nameNormalized: 'cetirizine 10mg',
                genericName: 'Cetirizine',
                manufacturer: 'Zydus Cadila',
                stock: 250,
                reorderLevel: 60,
                price: 3.00,
                batchNumber: 'CET2025004',
                batchNumberNormalized: 'cet2025004',
                expiryDate: new Date('2026-09-30'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Metformin 500mg',
                nameNormalized: 'metformin 500mg',
                genericName: 'Metformin Hydrochloride',
                manufacturer: 'Cipla Ltd',
                stock: 400,
                reorderLevel: 100,
                price: 4.50,
                batchNumber: 'MET2025005',
                batchNumberNormalized: 'met2025005',
                expiryDate: new Date('2027-08-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Atorvastatin 10mg',
                nameNormalized: 'atorvastatin 10mg',
                genericName: 'Atorvastatin',
                manufacturer: 'Lupin Ltd',
                stock: 200,
                reorderLevel: 50,
                price: 12.00,
                batchNumber: 'ATO2025006',
                batchNumberNormalized: 'ato2025006',
                expiryDate: new Date('2027-04-30'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Omeprazole 20mg',
                nameNormalized: 'omeprazole 20mg',
                genericName: 'Omeprazole',
                manufacturer: 'Sun Pharma',
                stock: 350,
                reorderLevel: 80,
                price: 6.50,
                batchNumber: 'OME2025007',
                batchNumberNormalized: 'ome2025007',
                expiryDate: new Date('2026-11-30'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Azithromycin 500mg',
                nameNormalized: 'azithromycin 500mg',
                genericName: 'Azithromycin',
                manufacturer: 'Alkem Laboratories',
                stock: 150,
                reorderLevel: 40,
                price: 15.00,
                batchNumber: 'AZI2025008',
                batchNumberNormalized: 'azi2025008',
                expiryDate: new Date('2027-05-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Vitamin D3 60K',
                nameNormalized: 'vitamin d3 60k',
                genericName: 'Cholecalciferol',
                manufacturer: 'Mankind Pharma',
                stock: 180,
                reorderLevel: 50,
                price: 45.00,
                batchNumber: 'VIT2025009',
                batchNumberNormalized: 'vit2025009',
                expiryDate: new Date('2027-12-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Pantoprazole 40mg',
                nameNormalized: 'pantoprazole 40mg',
                genericName: 'Pantoprazole',
                manufacturer: 'Torrent Pharma',
                stock: 280,
                reorderLevel: 70,
                price: 7.50,
                batchNumber: 'PAN2025010',
                batchNumberNormalized: 'pan2025010',
                expiryDate: new Date('2027-02-28'),
                isActive: true,
                addedAt: new Date()
              }
            ],
            'pharmacyData.suppliers': [
              {
                name: 'MediSupply Co.',
                contactPerson: 'Rajesh Kumar',
                phone: '+91-9876543210',
                email: 'rajesh@medisupply.com',
                address: '123 Supply Street, Delhi',
                gstin: 'GST29ABCDE1234F1Z5',
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'PharmaDirect Ltd',
                contactPerson: 'Priya Sharma',
                phone: '+91-9876543211',
                email: 'priya@pharmadirect.com',
                address: '456 Pharma Road, Mumbai',
                gstin: 'GST27FGHIJ5678K2Y6',
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'HealthCare Distributors',
                contactPerson: 'Amit Patel',
                phone: '+91-9876543212',
                email: 'amit@healthcaredist.com',
                address: '789 Medical Avenue, Bangalore',
                gstin: 'GST29KLMNO9012P3X7',
                isActive: true,
                addedAt: new Date()
              }
            ]
          }
        }
      );
      console.log(`✅ Updated Pharmacy 1 (HealthPlus Pharmacy): ${result1.modifiedCount} document(s) modified`);
      console.log('   - Added 10 medicines');
      console.log('   - Added 3 suppliers');
    }

    // Update Pharmacy 2 - MedLife Pharmacy
    const pharmacy2 = await User.findOne({ email: 'pharmacy2@test.com', role: ROLES.PHARMACY });
    if (pharmacy2) {
      const result2 = await User.updateOne(
        { _id: pharmacy2._id },
        {
          $set: {
            'pharmacyData.medicines': [
              {
                name: 'Aspirin 75mg',
                nameNormalized: 'aspirin 75mg',
                genericName: 'Acetylsalicylic Acid',
                manufacturer: 'Bayer',
                stock: 600,
                reorderLevel: 120,
                price: 1.50,
                batchNumber: 'ASP2025011',
                batchNumberNormalized: 'asp2025011',
                expiryDate: new Date('2027-07-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Ciprofloxacin 500mg',
                nameNormalized: 'ciprofloxacin 500mg',
                genericName: 'Ciprofloxacin',
                manufacturer: 'Ranbaxy',
                stock: 220,
                reorderLevel: 60,
                price: 10.00,
                batchNumber: 'CIP2025012',
                batchNumberNormalized: 'cip2025012',
                expiryDate: new Date('2027-01-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Dolo 650mg',
                nameNormalized: 'dolo 650mg',
                genericName: 'Paracetamol',
                manufacturer: 'Micro Labs',
                stock: 550,
                reorderLevel: 150,
                price: 3.50,
                batchNumber: 'DOL2025013',
                batchNumberNormalized: 'dol2025013',
                expiryDate: new Date('2026-10-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Crocin Advance',
                nameNormalized: 'crocin advance',
                genericName: 'Paracetamol',
                manufacturer: 'GSK',
                stock: 400,
                reorderLevel: 100,
                price: 4.00,
                batchNumber: 'CRO2025014',
                batchNumberNormalized: 'cro2025014',
                expiryDate: new Date('2027-03-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Calpol 500mg',
                nameNormalized: 'calpol 500mg',
                genericName: 'Paracetamol',
                manufacturer: 'GSK',
                stock: 320,
                reorderLevel: 80,
                price: 3.00,
                batchNumber: 'CAL2025015',
                batchNumberNormalized: 'cal2025015',
                expiryDate: new Date('2026-12-31'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Levocetrizine 5mg',
                nameNormalized: 'levocetrizine 5mg',
                genericName: 'Levocetirizine',
                manufacturer: 'Sun Pharma',
                stock: 280,
                reorderLevel: 70,
                price: 4.50,
                batchNumber: 'LEV2025016',
                batchNumberNormalized: 'lev2025016',
                expiryDate: new Date('2027-06-30'),
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'Montelukast 10mg',
                nameNormalized: 'montelukast 10mg',
                genericName: 'Montelukast',
                manufacturer: 'Cipla Ltd',
                stock: 150,
                reorderLevel: 40,
                price: 8.00,
                batchNumber: 'MON2025017',
                batchNumberNormalized: 'mon2025017',
                expiryDate: new Date('2027-09-30'),
                isActive: true,
                addedAt: new Date()
              }
            ],
            'pharmacyData.suppliers': [
              {
                name: 'Global Pharma Suppliers',
                contactPerson: 'Suresh Reddy',
                phone: '+91-9876543213',
                email: 'suresh@globalpharma.com',
                address: '321 Distribution Lane, Hyderabad',
                gstin: 'GST36QRSTU3456V4W8',
                isActive: true,
                addedAt: new Date()
              },
              {
                name: 'MediSource India',
                contactPerson: 'Neha Gupta',
                phone: '+91-9876543214',
                email: 'neha@medisource.in',
                address: '654 Healthcare Blvd, Pune',
                gstin: 'GST27WXYZAB7890C5D9',
                isActive: true,
                addedAt: new Date()
              }
            ]
          }
        }
      );
      console.log(`✅ Updated Pharmacy 2 (MedLife Pharmacy): ${result2.modifiedCount} document(s) modified`);
      console.log('   - Added 7 medicines');
      console.log('   - Added 2 suppliers');
    }

    // Verify the updates
    console.log('\n📋 Verification:');
    const updatedPharmacy1 = await User.findOne({ email: 'pharmacy1@test.com' }).lean();
    const updatedPharmacy2 = await User.findOne({ email: 'pharmacy2@test.com' }).lean();
    
    console.log(`Pharmacy 1 medicines count: ${updatedPharmacy1?.pharmacyData?.medicines?.length || 0}`);
    console.log(`Pharmacy 1 suppliers count: ${updatedPharmacy1?.pharmacyData?.suppliers?.length || 0}`);
    console.log(`Pharmacy 2 medicines count: ${updatedPharmacy2?.pharmacyData?.medicines?.length || 0}`);
    console.log(`Pharmacy 2 suppliers count: ${updatedPharmacy2?.pharmacyData?.suppliers?.length || 0}`);

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
    console.log('✅ Pharmacy data updated successfully!');

  } catch (error) {
    console.error('❌ Error updating pharmacy data:', error);
    process.exit(1);
  }
}

updatePharmacyData();

module.exports = mongoose;

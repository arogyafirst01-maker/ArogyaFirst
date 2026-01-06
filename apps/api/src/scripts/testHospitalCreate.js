const mongoose = require('mongoose');
const User = require('../models/User.model.js');
const { ROLES, VERIFICATION_STATUS } = require('@arogyafirst/shared');

const MONGODB_URI = 'mongodb+srv://arogyafirst01_db_user:jQi8mcB9eYP8FL2r@cluster0.kgrwhjd.mongodb.net/arogyafirst';

mongoose.set('autoIndex', false);
mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  const testHospital = await User.create({
    email: 'testhospital@test.com',
    emailNormalized: 'testhospital@test.com',
    password: 'Test@1234',
    role: ROLES.HOSPITAL,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'TEST001',
    hospitalData: {
      name: 'Test Hospital',
      location: 'Test Location',
      beds: [
        {
          bedNumber: 'TEST-001',
          type: 'General',
          floor: '1st Floor',
          ward: 'General Ward',
          isOccupied: false,
          isActive: true,
        },
      ],
    },
  });
  
  console.log('\n=== Created Hospital ===');
  console.log('Beds count:', testHospital.hospitalData?.beds?.length || 0);
  
  const fetched = await User.findById(testHospital._id).lean();
  console.log('\n=== Fetched Hospital ===');
  console.log('Beds count:', fetched.hospitalData?.beds?.length || 0);
  console.log('Beds:', JSON.stringify(fetched.hospitalData?.beds, null, 2));
  
  await User.deleteOne({ _id: testHospital._id });
  console.log('\n=== Deleted test hospital ===');
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

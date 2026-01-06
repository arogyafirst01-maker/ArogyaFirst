const mongoose = require('mongoose');
const User = require('../models/User.model.js');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://arogyafirst01_db_user:arogyafirst01_db_password@arogyafirst-db.g2qwb.mongodb.net/arogyafirst';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  const hospital = await User.findOne({ email: 'hospital1@test.com' }).lean();
  
  console.log('\n=== Hospital Data Counts ===');
  console.log('Doctors:', hospital?.hospitalData?.doctors?.length || 0);
  console.log('Labs:', hospital?.hospitalData?.labs?.length || 0);
  console.log('Pharmacies:', hospital?.hospitalData?.pharmacies?.length || 0);
  console.log('Beds:', hospital?.hospitalData?.beds?.length || 0);
  console.log('Staff:', hospital?.hospitalData?.staff?.length || 0);
  
  if (hospital?.hospitalData?.beds?.length > 0) {
    console.log('\n=== First Bed ===');
    console.log(JSON.stringify(hospital.hospitalData.beds[0], null, 2));
  }
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

module.exports = mongoose;

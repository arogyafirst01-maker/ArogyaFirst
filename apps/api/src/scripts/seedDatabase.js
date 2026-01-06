const mongoose = require('mongoose');
const User = require('../models/User.model.js');
const Booking = require('../models/Booking.model.js');
const Consultation = require('../models/Consultation.model.js');
const Document = require('../models/Document.model.js');
const ConsentRequest = require('../models/ConsentRequest.model.js');
const Prescription = require('../models/Prescription.model.js');
const Referral = require('../models/Referral.model.js');
const Slot = require('../models/Slot.model.js');
const Payment = require('../models/Payment.model.js');
const { ROLES, CONSULTATION_TYPES, BOOKING_STATUS, CONSENT_STATUS, VERIFICATION_STATUS, DOCUMENT_TYPES, DOCUMENT_UPLOAD_SOURCE, BOOKING_TYPES, PAYMENT_STATUS, PAYMENT_METHODS, CONSULTATION_STATUS, CONSULTATION_MODE, PRESCRIPTION_STATUS, REFERRAL_STATUS, REFERRAL_TYPES } = require('@arogyafirst/shared');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/arogyafirst';

const connectDB = async () => {
  try {
    // Disable autoIndex to prevent schema from creating indexes
    mongoose.set('autoIndex', false);
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Drop collections to remove old indexes
    try {
      await mongoose.connection.dropCollection('users');
      console.log('✅ Dropped users collection');
    } catch (e) {
      if (!e.message.includes('ns not found')) {
        console.log('ℹ️  Users collection already empty');
      }
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Clear existing data
const clearDatabase = async () => {
  console.log('\n🗑️  Clearing existing data...');
  await User.deleteMany({});
  await Booking.deleteMany({});
  await Consultation.deleteMany({});
  await Document.deleteMany({});
  await ConsentRequest.deleteMany({});
  await Prescription.deleteMany({});
  await Referral.deleteMany({});
  await Slot.deleteMany({});
  await Payment.deleteMany({});
  console.log('✅ Database cleared');
};

// Seed users
const seedUsers = async () => {
  console.log('\n👥 Creating users...');
  
  // Use plain password - the pre-save hook will hash it
  const password = 'Test@1234';

  // Helper to normalize email
  const normalizeEmail = (email) => email.toLowerCase().trim();

  // Admin
  const admin = await User.create({
    email: 'admin@arogyafirst.com',
    emailNormalized: normalizeEmail('admin@arogyafirst.com'),
    password: password,
    role: ROLES.ADMIN,
    uniqueId: 'ADMIN-001',
    isActive: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
  });
  console.log('✅ Admin created:', admin.email);

  // Patients
  const patient1 = await User.create({
    email: 'patient1@test.com',
    emailNormalized: normalizeEmail('patient1@test.com'),
    password: password,
    role: ROLES.PATIENT,
    uniqueId: 'PAT-001',
    isActive: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    patientData: {
      name: 'Rahul Sharma',
      dateOfBirth: new Date('1990-05-15'),
      phone: '9876543210',
      aadhaarLast4: '1234',
      location: '123 MG Road, Bangalore',
      medicalHistory: [
        {
          type: 'ALLERGY',
          description: 'Penicillin allergy',
          date: new Date('2020-01-15'),
          notes: 'Severe reaction, avoid all penicillin-based antibiotics',
        },
        {
          type: 'CHRONIC_CONDITION',
          description: 'Type 2 Diabetes',
          date: new Date('2018-06-10'),
          notes: 'Controlled with Metformin 500mg twice daily',
        },
      ],
    },
  });

  const patient2 = await User.create({
    email: 'patient2@test.com',
    emailNormalized: normalizeEmail('patient2@test.com'),
    password: password,
    role: ROLES.PATIENT,
    uniqueId: 'PAT-002',
    isActive: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    patientData: {
      name: 'Priya Patel',
      dateOfBirth: new Date('1985-08-22'),
      phone: '9876543211',
      aadhaarLast4: '5678',
      location: '456 Park Street, Mumbai',
      medicalHistory: [
        {
          type: 'SURGERY',
          description: 'Appendectomy',
          date: new Date('2015-03-20'),
          notes: 'Laparoscopic surgery, no complications',
        },
      ],
    },
  });

  const patient3 = await User.create({
    email: 'patient3@test.com',
    emailNormalized: normalizeEmail('patient3@test.com'),
    password: password,
    role: ROLES.PATIENT,
    uniqueId: 'PAT-003',
    isActive: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    patientData: {
      name: 'Amit Kumar',
      dateOfBirth: new Date('1995-12-05'),
      phone: '9876543212',
      aadhaarLast4: '9012',
      location: '789 Nehru Place, Delhi',
    },
  });

  const patients = [patient1, patient2, patient3];
  console.log(`✅ Created ${patients.length} patients`);

  // Hospitals with embedded doctors, labs, and pharmacies
  const hospital1 = await User.create({
    email: 'hospital1@test.com',
    emailNormalized: normalizeEmail('hospital1@test.com'),
    password: password,
    role: ROLES.HOSPITAL,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'HOS001',
    hospitalData: {
      name: 'Apollo Multispeciality Hospital',
      location: '100 Healthcare Avenue, Bangalore',
      doctors: [
        {
          name: 'Dr. Rajesh Mehta',
          specialization: 'Cardiology',
          qualification: 'MBBS, MD (Cardiology)',
          experience: 15,
          contactPhone: '9876543220',
          email: 'rajesh.mehta@apollo.com',
          schedule: 'Mon-Fri: 9AM-5PM',
          isActive: true,
        },
        {
          name: 'Dr. Anjali Desai',
          specialization: 'Orthopedics',
          qualification: 'MBBS, MS (Orthopedics)',
          experience: 10,
          contactPhone: '9876543221',
          email: 'anjali.desai@apollo.com',
          schedule: 'Mon-Sat: 10AM-6PM',
          isActive: true,
        },
        {
          name: 'Dr. Priya Sharma',
          specialization: 'Pediatrics',
          qualification: 'MBBS, MD (Pediatrics)',
          experience: 8,
          contactPhone: '9876543222',
          email: 'priya.sharma@apollo.com',
          schedule: 'Tue-Sun: 8AM-4PM',
          isActive: true,
        },
      ],
      labs: [
        {
          name: 'Apollo Diagnostics Center',
          type: 'Pathology & Radiology',
          location: 'Building A, 1st Floor',
          contactPhone: '9876543230',
          availableTests: ['Blood Test', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG'],
          isActive: true,
        },
        {
          name: 'Apollo Clinical Lab',
          type: 'Pathology',
          location: 'Building B, Ground Floor',
          contactPhone: '9876543231',
          availableTests: ['Blood Test', 'Urine Test', 'Stool Test', 'Culture Tests'],
          isActive: true,
        },
      ],
      pharmacies: [
        {
          name: 'Apollo Pharmacy 24x7',
          location: 'Building A, Ground Floor',
          contactPhone: '9876543240',
          operatingHours: '24 Hours',
          isActive: true,
        },
        {
          name: 'Apollo Emergency Pharmacy',
          location: 'Emergency Wing',
          contactPhone: '9876543241',
          operatingHours: '24 Hours',
          isActive: true,
        },
      ],
      beds: [
        {
          bedNumber: 'ICU-101',
          type: 'ICU',
          floor: '1st Floor',
          ward: 'ICU Ward A',
          isOccupied: true,
          isActive: true,
        },
        {
          bedNumber: 'ICU-102',
          type: 'ICU',
          floor: '1st Floor',
          ward: 'ICU Ward A',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'GEN-201',
          type: 'General',
          floor: '2nd Floor',
          ward: 'General Ward B',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'GEN-202',
          type: 'General',
          floor: '2nd Floor',
          ward: 'General Ward B',
          isOccupied: true,
          isActive: true,
        },
        {
          bedNumber: 'PVT-301',
          type: 'Private',
          floor: '3rd Floor',
          ward: 'Private Wing',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'PVT-302',
          type: 'Private',
          floor: '3rd Floor',
          ward: 'Private Wing',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'EMR-001',
          type: 'Emergency',
          floor: 'Ground Floor',
          ward: 'Emergency',
          isOccupied: false,
          isActive: true,
        },
      ],
      staff: [
        {
          name: 'Nurse Anita Singh',
          role: 'Head Nurse',
          department: 'ICU',
          contactPhone: '9876543280',
          email: 'anita.singh@apollo.com',
          shift: 'Day Shift (8AM-4PM)',
          isActive: true,
        },
        {
          name: 'Nurse Rajesh Kumar',
          role: 'Staff Nurse',
          department: 'General Ward',
          contactPhone: '9876543281',
          email: 'rajesh.kumar@apollo.com',
          shift: 'Night Shift (8PM-4AM)',
          isActive: true,
        },
        {
          name: 'Technician Priya Das',
          role: 'Lab Technician',
          department: 'Diagnostics',
          contactPhone: '9876543282',
          email: 'priya.das@apollo.com',
          shift: 'Day Shift (9AM-5PM)',
          isActive: true,
        },
        {
          name: 'Admin Suresh Reddy',
          role: 'Front Desk',
          department: 'Administration',
          contactPhone: '9876543283',
          email: 'suresh.reddy@apollo.com',
          shift: 'Day Shift (8AM-6PM)',
          isActive: true,
        },
        {
          name: 'Pharmacist Kavita Sharma',
          role: 'Pharmacist',
          department: 'Pharmacy',
          contactPhone: '9876543284',
          email: 'kavita.sharma@apollo.com',
          shift: 'Evening Shift (2PM-10PM)',
          isActive: true,
        },
      ],
    },
  });

  const hospital2 = await User.create({
    email: 'hospital2@test.com',
    emailNormalized: normalizeEmail('hospital2@test.com'),
    password: password,
    role: ROLES.HOSPITAL,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'HOS002',
    hospitalData: {
      name: 'Fortis Healthcare Center',
      location: '200 Medical Complex, Mumbai',
      doctors: [
        {
          name: 'Dr. Sanjay Gupta',
          specialization: 'Cardiology',
          qualification: 'MBBS, MD (Cardiology), DM (Interventional Cardiology)',
          experience: 20,
          contactPhone: '9876543250',
          email: 'sanjay.gupta@fortis.com',
          schedule: 'Mon-Sat: 2PM-8PM',
          isActive: true,
        },
        {
          name: 'Dr. Neha Kapoor',
          specialization: 'Neurology',
          qualification: 'MBBS, MD, DM (Neurology)',
          experience: 12,
          contactPhone: '9876543251',
          email: 'neha.kapoor@fortis.com',
          schedule: 'Tue-Sat: 10AM-4PM',
          isActive: true,
        },
      ],
      labs: [
        {
          name: 'Fortis Diagnostics',
          type: 'Full Service',
          location: 'Main Building, 2nd Floor',
          contactPhone: '9876543260',
          availableTests: ['Blood Test', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'PET Scan'],
          isActive: true,
        },
      ],
      pharmacies: [
        {
          name: 'Fortis Pharmacy',
          location: 'Main Lobby',
          contactPhone: '9876543270',
          operatingHours: '8AM - 10PM',
          isActive: true,
        },
      ],
      beds: [
        {
          bedNumber: 'ICU-201',
          type: 'ICU',
          floor: '2nd Floor',
          ward: 'ICU Ward',
          isOccupied: true,
          isActive: true,
        },
        {
          bedNumber: 'ICU-202',
          type: 'ICU',
          floor: '2nd Floor',
          ward: 'ICU Ward',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'GEN-101',
          type: 'General',
          floor: '1st Floor',
          ward: 'General Ward',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'PVT-301',
          type: 'Private',
          floor: '3rd Floor',
          ward: 'Private Suite',
          isOccupied: false,
          isActive: true,
        },
        {
          bedNumber: 'SEMI-401',
          type: 'Semi-Private',
          floor: '4th Floor',
          ward: 'Semi-Private Ward',
          isOccupied: true,
          isActive: true,
        },
      ],
      staff: [
        {
          name: 'Nurse Meera Joshi',
          role: 'Head Nurse',
          department: 'ICU',
          contactPhone: '9876543290',
          email: 'meera.joshi@fortis.com',
          shift: 'Day Shift (8AM-4PM)',
          isActive: true,
        },
        {
          name: 'Technician Amit Verma',
          role: 'Radiology Technician',
          department: 'Diagnostics',
          contactPhone: '9876543291',
          email: 'amit.verma@fortis.com',
          shift: 'Day Shift (9AM-5PM)',
          isActive: true,
        },
        {
          name: 'Admin Pooja Nair',
          role: 'Reception Manager',
          department: 'Administration',
          contactPhone: '9876543292',
          email: 'pooja.nair@fortis.com',
          shift: 'Day Shift (8AM-6PM)',
          isActive: true,
        },
      ],
    },
  });

  const hospitals = [hospital1, hospital2];
  console.log(`✅ Created ${hospitals.length} hospitals`);

  // Doctors
  const doctor1 = await User.create({
    email: 'doctor1@test.com',
    emailNormalized: normalizeEmail('doctor1@test.com'),
    password: password,
    role: ROLES.DOCTOR,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'HOS001-DOC-001',
    doctorData: {
      name: 'Dr. Rajesh Mehta',
      qualification: 'MBBS, MD (Cardiology)',
      specialization: 'Cardiology',
      experience: 15,
      hospitalId: 'HOS001',
      location: 'Bangalore',
      dateOfBirth: new Date('1975-04-10'),
      aadhaarLast4: '3456',
      slots: [
        {
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
          startTime: '09:00',
          endTime: '12:00',
          capacity: 10,
          booked: 2,
          consultationType: CONSULTATION_TYPES.IN_PERSON,
          isActive: true,
        },
        {
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          startTime: '14:00',
          endTime: '17:00',
          capacity: 8,
          booked: 0,
          consultationType: CONSULTATION_TYPES.TELECONSULTATION,
          isActive: true,
        },
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
          startTime: '10:00',
          endTime: '13:00',
          capacity: 12,
          booked: 0,
          consultationType: CONSULTATION_TYPES.IN_PERSON,
          isActive: true,
        },
      ],
    },
  });

  const doctor2 = await User.create({
    email: 'doctor2@test.com',
    emailNormalized: normalizeEmail('doctor2@test.com'),
    password: password,
    role: ROLES.DOCTOR,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'HOS001-DOC-002',
    doctorData: {
      name: 'Dr. Anjali Desai',
      qualification: 'MBBS, MS (Orthopedics)',
      specialization: 'Orthopedics',
      experience: 10,
      hospitalId: 'HOS001',
      location: 'Bangalore',
      dateOfBirth: new Date('1982-07-18'),
      aadhaarLast4: '7890',
      slots: [
        {
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          startTime: '10:00',
          endTime: '13:00',
          capacity: 8,
          booked: 1,
          consultationType: CONSULTATION_TYPES.IN_PERSON,
          isActive: true,
        },
      ],
    },
  });

  const doctor3 = await User.create({
    email: 'doctor3@test.com',
    emailNormalized: normalizeEmail('doctor3@test.com'),
    password: password,
    role: ROLES.DOCTOR,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'HOS002-DOC-001',
    doctorData: {
      name: 'Dr. Sanjay Gupta',
      qualification: 'MBBS, MD (Cardiology), DM (Interventional Cardiology)',
      specialization: 'Cardiology',
      experience: 20,
      hospitalId: 'HOS002',
      location: '75 Medical Plaza, Mumbai',
      dateOfBirth: new Date('1970-11-25'),
      aadhaarLast4: '2468',
      slots: [
        {
          date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
          startTime: '14:00',
          endTime: '18:00',
          capacity: 10,
          booked: 0,
          consultationType: CONSULTATION_TYPES.IN_PERSON,
          isActive: true,
        },
        {
          date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          startTime: '09:00',
          endTime: '13:00',
          capacity: 12,
          booked: 0,
          consultationType: CONSULTATION_TYPES.VIDEO,
          isActive: true,
        },
      ],
    },
  });

  const doctors = [doctor1, doctor2, doctor3];
  console.log(`✅ Created ${doctors.length} doctors`);

  // Labs
  const lab1 = await User.create({
    email: 'lab1@test.com',
    emailNormalized: normalizeEmail('lab1@test.com'),
    password: password,
    role: ROLES.LAB,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'LAB001',
    labData: {
      name: 'PathLab Diagnostics',
      location: '50 Lab Complex, Bangalore',
      facilities: ['Blood Test', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound'],
      machines: [
        { name: 'MRI Scanner 3T', type: 'MRI', manufacturer: 'Siemens', model: 'MAGNETOM Skyra', isActive: true },
        { name: 'CT Scanner 64-slice', type: 'CT', manufacturer: 'GE Healthcare', model: 'Revolution CT', isActive: true },
        { name: 'Digital X-Ray', type: 'X-Ray', manufacturer: 'Philips', model: 'DigitalDiagnost C90', isActive: true },
      ],
    },
  });

  const lab2 = await User.create({
    email: 'lab2@test.com',
    emailNormalized: normalizeEmail('lab2@test.com'),
    password: password,
    role: ROLES.LAB,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'LAB002',
    labData: {
      name: 'Metro Diagnostics',
      location: '75 Medical Plaza, Mumbai',
      facilities: ['Blood Test', 'Urine Test', 'ECG', 'X-Ray', 'Pathology'],
    },
  });

  const labs = [lab1, lab2];
  console.log(`✅ Created ${labs.length} labs`);

  // Pharmacies
  const pharmacy1 = await User.create({
    email: 'pharmacy1@test.com',
    emailNormalized: normalizeEmail('pharmacy1@test.com'),
    password: password,
    role: ROLES.PHARMACY,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'PHA001',
    pharmacyData: {
      name: 'HealthPlus Pharmacy',
      location: '25 Pharma Street, Bangalore',
      licenseNumber: 'PHA-KA-2024-001',
    },
  });

  const pharmacy2 = await User.create({
    email: 'pharmacy2@test.com',
    emailNormalized: normalizeEmail('pharmacy2@test.com'),
    password: password,
    role: ROLES.PHARMACY,
    isActive: true,
    isVerified: true,
    verificationStatus: VERIFICATION_STATUS.APPROVED,
    uniqueId: 'PHA002',
    pharmacyData: {
      name: 'MedLife Pharmacy',
      location: '40 Medicine Road, Mumbai',
      licenseNumber: 'PHA-MH-2024-002',
    },
  });

  const pharmacies = [pharmacy1, pharmacy2];
  console.log(`✅ Created ${pharmacies.length} pharmacies`);

  return { admin, patients, hospitals, doctors, labs, pharmacies };
};

// Seed bookings
const seedBookings = async (patients, doctors, slots) => {
  console.log('\n📅 Creating bookings...');

  const bookings = await Booking.insertMany([
    {
      bookingId: 'BOOK-' + Date.now() + '-001',
      patientId: patients[0]._id,
      providerId: doctors[0]._id,
      slotId: slots[0]._id,
      entityType: BOOKING_TYPES.OPD,
      bookingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      bookingTime: {
        startTime: '09:00',
        endTime: '09:30',
      },
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      paymentAmount: 800,
      paymentMethod: PAYMENT_METHODS.ONLINE,
      patientSnapshot: {
        name: patients[0].patientData.name,
        phone: patients[0].patientData.phone,
        email: patients[0].email,
      },
      providerSnapshot: {
        name: doctors[0].doctorData.name,
        role: ROLES.DOCTOR,
        specialization: doctors[0].doctorData.specialization,
        location: doctors[0].doctorData.location,
      },
      slotSnapshot: {
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        time: {
          startTime: '09:00',
          endTime: '09:30',
        },
        capacity: 10,
      },
      createdBy: patients[0]._id,
    },
    {
      bookingId: 'BOOK-' + Date.now() + '-002',
      patientId: patients[1]._id,
      providerId: doctors[1]._id,
      slotId: slots[3]._id,
      entityType: BOOKING_TYPES.OPD,
      bookingDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      bookingTime: {
        startTime: '10:00',
        endTime: '10:30',
      },
      status: BOOKING_STATUS.CONFIRMED,
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      paymentAmount: 700,
      paymentMethod: PAYMENT_METHODS.ONLINE,
      patientSnapshot: {
        name: patients[1].patientData.name,
        phone: patients[1].patientData.phone,
        email: patients[1].email,
      },
      providerSnapshot: {
        name: doctors[1].doctorData.name,
        role: ROLES.DOCTOR,
        specialization: doctors[1].doctorData.specialization,
        location: doctors[1].doctorData.location,
      },
      slotSnapshot: {
        date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        time: {
          startTime: '10:00',
          endTime: '10:30',
        },
        capacity: 8,
      },
      createdBy: patients[1]._id,
    },
    {
      bookingId: 'BOOK-' + Date.now() + '-003',
      patientId: patients[0]._id,
      providerId: doctors[0]._id,
      slotId: slots[0]._id,
      entityType: BOOKING_TYPES.OPD,
      bookingDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      bookingTime: {
        startTime: '14:00',
        endTime: '14:30',
      },
      status: BOOKING_STATUS.COMPLETED,
      paymentStatus: PAYMENT_STATUS.SUCCESS,
      paymentAmount: 800,
      paymentMethod: PAYMENT_METHODS.ONLINE,
      patientSnapshot: {
        name: patients[0].patientData.name,
        phone: patients[0].patientData.phone,
        email: patients[0].email,
      },
      providerSnapshot: {
        name: doctors[0].doctorData.name,
        role: ROLES.DOCTOR,
        specialization: doctors[0].doctorData.specialization,
        location: doctors[0].doctorData.location,
      },
      slotSnapshot: {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        time: {
          startTime: '14:00',
          endTime: '14:30',
        },
        capacity: 8,
      },
      createdBy: patients[0]._id,
    },
  ]);
  console.log(`✅ Created ${bookings.length} bookings`);

  return bookings;
};

// Seed consultations
const seedConsultations = async (bookings, patients, doctors) => {
  console.log('\n🩺 Creating consultations...');

  const consultations = await Consultation.insertMany([
    {
      consultationId: 'CONS-' + Date.now() + '-001',
      bookingId: bookings[2]._id,
      patientId: patients[0]._id,
      doctorId: doctors[0]._id,
      mode: CONSULTATION_MODE.VIDEO_CALL,
      status: CONSULTATION_STATUS.COMPLETED,
      scheduledAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      startedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      endedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000),
      duration: 30,
      diagnosis: 'Type 2 Diabetes - well controlled',
      notes: [
        {
          content: 'Patient is responding well to current medication. Continue with Metformin 500mg twice daily. Follow-up in 3 months.',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
      ],
      messages: [
        {
          senderId: doctors[0]._id,
          senderRole: 'DOCTOR',
          message: 'Hello, how are you feeling today?',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          senderId: patients[0]._id,
          senderRole: 'PATIENT',
          message: 'I am feeling much better, doctor. Blood sugar levels have been stable.',
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 2 * 60 * 1000),
        },
      ],
      createdBy: doctors[0]._id,
    },
    {
      consultationId: 'CONS-' + Date.now() + '-002',
      bookingId: bookings[0]._id,
      patientId: patients[0]._id,
      doctorId: doctors[0]._id,
      mode: CONSULTATION_MODE.IN_PERSON,
      status: CONSULTATION_STATUS.SCHEDULED,
      scheduledAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      createdBy: doctors[0]._id,
    },
  ]);
  console.log(`✅ Created ${consultations.length} consultations`);

  return consultations;
};

// Seed documents
const seedDocuments = async (patients, doctors) => {
  console.log('\n📄 Creating documents...');

  const documents = await Document.insertMany([
    {
      documentId: 'DOC-' + Date.now() + '-1',
      patientId: patients[0]._id,
      uploadedBy: doctors[0]._id,
      uploadSource: DOCUMENT_UPLOAD_SOURCE.PROVIDER_SUBMISSION,
      documentType: DOCUMENT_TYPES.LAB_REPORT,
      title: 'Blood Test Report - HbA1c',
      description: 'Quarterly diabetes monitoring',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample.pdf',
      publicId: 'sample_report_1',
      format: 'pdf',
      size: 245760,
      uploadedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      documentId: 'DOC-' + Date.now() + '-2',
      patientId: patients[0]._id,
      uploadedBy: patients[0]._id,
      uploadSource: DOCUMENT_UPLOAD_SOURCE.PATIENT_UPLOAD,
      documentType: DOCUMENT_TYPES.PRESCRIPTION,
      title: 'Prescription - Metformin',
      description: 'Current diabetes medication',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample2.pdf',
      publicId: 'sample_report_2',
      format: 'pdf',
      size: 180000,
      uploadedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
    {
      documentId: 'DOC-' + Date.now() + '-3',
      patientId: patients[1]._id,
      uploadedBy: doctors[1]._id,
      uploadSource: DOCUMENT_UPLOAD_SOURCE.PROVIDER_SUBMISSION,
      documentType: DOCUMENT_TYPES.LAB_REPORT,
      title: 'Knee X-Ray Report',
      description: 'AP and Lateral views of knee joint',
      fileUrl: 'https://res.cloudinary.com/demo/image/upload/sample3.pdf',
      publicId: 'sample_report_3',
      format: 'pdf',
      size: 320000,
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ]);
  console.log(`✅ Created ${documents.length} documents`);

  return documents;
};

// Seed consent requests
const seedConsentRequests = async (patients, doctors) => {
  console.log('\n🛡️  Creating consent requests...');

  const consentRequests = await ConsentRequest.insertMany([
    {
      consentId: 'CONSENT-' + Date.now() + '-001',
      patientId: patients[1]._id,
      requesterId: doctors[1]._id,
      requesterRole: ROLES.DOCTOR,
      purpose: 'Access medical history for orthopedic consultation',
      requestedDocuments: ['Medical History', 'Previous X-Rays'],
      status: CONSENT_STATUS.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    {
      consentId: 'CONSENT-' + Date.now() + '-002',
      patientId: patients[0]._id,
      requesterId: doctors[0]._id,
      requesterRole: ROLES.DOCTOR,
      purpose: 'Ongoing diabetes management',
      requestedDocuments: ['All Medical Records'],
      status: CONSENT_STATUS.APPROVED,
      grantedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  ]);
  console.log(`✅ Created ${consentRequests.length} consent requests`);

  return consentRequests;
};

// Seed prescriptions
const seedPrescriptions = async (patients, doctors, pharmacies) => {
  console.log('\n💊 Creating prescriptions...');

  const prescriptions = await Prescription.insertMany([
    {
      prescriptionId: 'PRES-' + Date.now() + '-001',
      patientId: patients[0]._id,
      doctorId: doctors[0]._id,
      diagnosis: 'Type 2 Diabetes Mellitus',
      medications: [
        {
          name: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          duration: '90 days',
          instructions: 'Take with meals',
        },
        {
          name: 'Glimepiride',
          dosage: '2mg',
          frequency: 'Once daily',
          duration: '90 days',
          instructions: 'Take before breakfast',
        },
      ],
      instructions: 'Monitor blood sugar levels daily. Follow diet plan. Regular exercise recommended.',
      validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      linkedPharmacies: [pharmacies[0]._id],
      status: PRESCRIPTION_STATUS.PENDING,
      createdBy: doctors[0]._id,
    },
    {
      prescriptionId: 'PRES-' + Date.now() + '-002',
      patientId: patients[1]._id,
      doctorId: doctors[1]._id,
      diagnosis: 'Knee Osteoarthritis',
      medications: [
        {
          name: 'Ibuprofen',
          dosage: '400mg',
          frequency: 'Three times daily',
          duration: '14 days',
          instructions: 'Take after meals',
        },
        {
          name: 'Calcium + Vitamin D3',
          dosage: '500mg',
          frequency: 'Once daily',
          duration: '30 days',
          instructions: 'Take with breakfast',
        },
      ],
      instructions: 'Apply hot/cold compress. Avoid strenuous activities. Physiotherapy recommended.',
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      linkedPharmacies: [pharmacies[0]._id, pharmacies[1]._id],
      status: PRESCRIPTION_STATUS.PENDING,
      createdBy: doctors[1]._id,
    },
  ]);
  console.log(`✅ Created ${prescriptions.length} prescriptions`);

  return prescriptions;
};

// Seed referrals
const seedReferrals = async (patients, doctors, hospitals, labs) => {
  console.log('\n🔄 Creating referrals...');

  const referrals = await Referral.insertMany([
    {
      referralId: 'REF-' + Date.now() + '-001',
      patientId: patients[0]._id,
      sourceId: doctors[0]._id,
      targetId: labs[0]._id,
      referralType: REFERRAL_TYPES.DOCTOR_TO_DOCTOR,
      reason: 'HbA1c and Lipid Profile test required for diabetes management',
      notes: 'Patient has Type 2 Diabetes. Need quarterly monitoring.',
      priority: 'MEDIUM',
      status: REFERRAL_STATUS.PENDING,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sourceSnapshot: {
        name: doctors[0].doctorData.name,
        role: ROLES.DOCTOR,
        specialization: doctors[0].doctorData.specialization,
        location: doctors[0].doctorData.location,
      },
      targetSnapshot: {
        name: labs[0].labData.name,
        role: ROLES.LAB,
        location: labs[0].labData.location,
      },
      patientSnapshot: {
        name: patients[0].patientData.name,
        phone: patients[0].patientData.phone,
        email: patients[0].email,
      },
      createdBy: doctors[0]._id,
    },
    {
      referralId: 'REF-' + Date.now() + '-002',
      patientId: patients[1]._id,
      sourceId: doctors[1]._id,
      targetId: labs[0]._id,
      referralType: REFERRAL_TYPES.DOCTOR_TO_DOCTOR,
      reason: 'Knee X-Ray required for osteoarthritis diagnosis',
      notes: 'Suspected osteoarthritis. Need AP and Lateral views.',
      priority: 'HIGH',
      status: REFERRAL_STATUS.ACCEPTED,
      acceptedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sourceSnapshot: {
        name: doctors[1].doctorData.name,
        role: ROLES.DOCTOR,
        specialization: doctors[1].doctorData.specialization,
        location: doctors[1].doctorData.location,
      },
      targetSnapshot: {
        name: labs[0].labData.name,
        role: ROLES.LAB,
        location: labs[0].labData.location,
      },
      patientSnapshot: {
        name: patients[1].patientData.name,
        phone: patients[1].patientData.phone,
        email: patients[1].email,
      },
      createdBy: doctors[1]._id,
    },
  ]);
  console.log(`✅ Created ${referrals.length} referrals`);

  return referrals;
};

// Seed slots
const seedSlots = async (doctors, hospitals, labs) => {
  console.log('\n📅 Creating slots...');

  const slots = await Slot.insertMany([
    // Doctor 1 (Cardiology) slots
    {
      providerId: doctors[0]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '09:00',
      endTime: '12:00',
      capacity: 10,
      booked: 2,
      availableCapacity: 8, // capacity - booked
      isActive: true,
      createdBy: doctors[0]._id,
    },
    {
      providerId: doctors[0]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '14:00',
      endTime: '17:00',
      capacity: 8,
      booked: 0,
      availableCapacity: 8, // capacity - booked
      isActive: true,
      createdBy: doctors[0]._id,
    },
    {
      providerId: doctors[0]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      startTime: '10:00',
      endTime: '13:00',
      capacity: 12,
      booked: 0,
      availableCapacity: 12, // capacity - booked
      isActive: true,
      createdBy: doctors[0]._id,
    },
    // Doctor 2 (Orthopedics) slots
    {
      providerId: doctors[1]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '10:00',
      endTime: '13:00',
      capacity: 8,
      booked: 1,
      availableCapacity: 7, // capacity - booked
      isActive: true,
      createdBy: doctors[1]._id,
    },
    {
      providerId: doctors[1]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      startTime: '09:00',
      endTime: '12:00',
      capacity: 6,
      booked: 0,
      availableCapacity: 6, // capacity - booked
      isActive: true,
      createdBy: doctors[1]._id,
    },
    // Doctor 3 (Cardiology, Mumbai) slots
    {
      providerId: doctors[2]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // Tomorrow
      startTime: '14:00',
      endTime: '18:00',
      capacity: 10,
      booked: 0,
      availableCapacity: 10, // capacity - booked
      isActive: true,
      createdBy: doctors[2]._id,
    },
    {
      providerId: doctors[2]._id,
      providerRole: ROLES.DOCTOR,
      entityType: BOOKING_TYPES.OPD,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      startTime: '09:00',
      endTime: '13:00',
      capacity: 12,
      booked: 0,
      availableCapacity: 12, // capacity - booked
      isActive: true,
      createdBy: doctors[2]._id,
    },
    // Hospital 1 (IPD) slots
    {
      providerId: hospitals[0]._id,
      providerRole: ROLES.HOSPITAL,
      entityType: BOOKING_TYPES.IPD,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '00:00',
      endTime: '23:59',
      capacity: 20,
      booked: 5,
      availableCapacity: 15,
      isActive: true,
      createdBy: hospitals[0]._id,
    },
    {
      providerId: hospitals[0]._id,
      providerRole: ROLES.HOSPITAL,
      entityType: BOOKING_TYPES.IPD,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startTime: '00:00',
      endTime: '23:59',
      capacity: 20,
      booked: 3,
      availableCapacity: 17,
      isActive: true,
      createdBy: hospitals[0]._id,
    },
    // Hospital 2 (IPD) slots
    {
      providerId: hospitals[1]._id,
      providerRole: ROLES.HOSPITAL,
      entityType: BOOKING_TYPES.IPD,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '00:00',
      endTime: '23:59',
      capacity: 25,
      booked: 8,
      availableCapacity: 17,
      isActive: true,
      createdBy: hospitals[1]._id,
    },
    {
      providerId: hospitals[1]._id,
      providerRole: ROLES.HOSPITAL,
      entityType: BOOKING_TYPES.IPD,
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      startTime: '00:00',
      endTime: '23:59',
      capacity: 25,
      booked: 10,
      availableCapacity: 15,
      isActive: true,
      createdBy: hospitals[1]._id,
    },
    // Lab slots
    {
      providerId: labs[0]._id,
      providerRole: ROLES.LAB,
      entityType: BOOKING_TYPES.LAB,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '08:00',
      endTime: '16:00',
      capacity: 20,
      booked: 3,
      availableCapacity: 17, // capacity - booked
      isActive: true,
      createdBy: labs[0]._id,
    },
    {
      providerId: labs[1]._id,
      providerRole: ROLES.LAB,
      entityType: BOOKING_TYPES.LAB,
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      startTime: '09:00',
      endTime: '17:00',
      capacity: 15,
      booked: 0,
      availableCapacity: 15, // capacity - booked
      isActive: true,
      createdBy: labs[1]._id,
    },
  ]);
  console.log(`✅ Created ${slots.length} slots`);

  return slots;
};

// Seed payments
const seedPayments = async (bookings, patients) => {
  console.log('\n💳 Creating payments...');

  const payments = await Payment.insertMany([
    {
      provider: 'RAZORPAY',
      paymentId: 'pay_' + Date.now() + 'ABC123',
      orderId: 'order_' + Date.now() + 'XYZ001',
      bookingId: bookings[0]._id,
      amount: 80000, // 800 rupees in paise
      currency: 'INR',
      status: PAYMENT_STATUS.SUCCESS,
      razorpaySignature: 'dummy_signature_1',
      paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdBy: patients[0]._id,
    },
    {
      provider: 'RAZORPAY',
      paymentId: 'pay_' + Date.now() + 'DEF456',
      orderId: 'order_' + Date.now() + 'XYZ002',
      bookingId: bookings[1]._id,
      amount: 70000, // 700 rupees in paise
      currency: 'INR',
      status: PAYMENT_STATUS.SUCCESS,
      razorpaySignature: 'dummy_signature_2',
      paidAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      createdBy: patients[1]._id,
    },
    {
      provider: 'RAZORPAY',
      paymentId: 'pay_' + Date.now() + 'GHI789',
      orderId: 'order_' + Date.now() + 'XYZ003',
      bookingId: bookings[2]._id,
      amount: 80000, // 800 rupees in paise
      currency: 'INR',
      status: PAYMENT_STATUS.SUCCESS,
      razorpaySignature: 'dummy_signature_3',
      paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      createdBy: patients[0]._id,
    },
  ]);
  console.log(`✅ Created ${payments.length} payments`);

  return payments;
};

// Main seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');
    console.log('=' .repeat(50));

    await connectDB();
    await clearDatabase();

    const users = await seedUsers();
    const slots = await seedSlots(users.doctors, users.hospitals, users.labs);
    const bookings = await seedBookings(users.patients, users.doctors, slots);
    const consultations = await seedConsultations(bookings, users.patients, users.doctors);
    const documents = await seedDocuments(users.patients, users.doctors);
    const consentRequests = await seedConsentRequests(users.patients, users.doctors);
    const prescriptions = await seedPrescriptions(users.patients, users.doctors, users.pharmacies);
    const referrals = await seedReferrals(users.patients, users.doctors, users.hospitals, users.labs);
    const payments = await seedPayments(bookings, users.patients);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 Database seeding completed successfully!');
    console.log('=' .repeat(50));
    console.log('\n📋 Test Accounts Summary:');
    console.log('=' .repeat(50));
    console.log('\n👤 ADMIN:');
    console.log('   Email: admin@arogyafirst.com');
    console.log('   Password: Test@1234');
    console.log('\n👥 PATIENTS:');
    console.log('   Email: patient1@test.com (Rahul Sharma - has diabetes history)');
    console.log('   Email: patient2@test.com (Priya Patel - has surgery history)');
    console.log('   Email: patient3@test.com (Amit Kumar - new patient)');
    console.log('   Password: Test@1234 (for all)');
    console.log('\n🏥 HOSPITALS:');
    console.log('   Email: hospital1@test.com (Apollo Multispeciality Hospital)');
    console.log('   Email: hospital2@test.com (Fortis Healthcare Center)');
    console.log('   Password: Test@1234 (for all)');
    console.log('\n👨‍⚕️  DOCTORS:');
    console.log('   Email: doctor1@test.com (Dr. Rajesh - Cardiology, has slots)');
    console.log('   Email: doctor2@test.com (Dr. Anjali - Orthopedics, has slots)');
    console.log('   Email: doctor3@test.com (Dr. Sanjay - General Medicine)');
    console.log('   Password: Test@1234 (for all)');
    console.log('\n🔬 LABS:');
    console.log('   Email: lab1@test.com (PathLab - MRI, CT, X-Ray machines)');
    console.log('   Email: lab2@test.com (Metro Diagnostics)');
    console.log('   Password: Test@1234 (for all)');
    console.log('\n💊 PHARMACIES:');
    console.log('   Email: pharmacy1@test.com (HealthPlus Pharmacy)');
    console.log('   Email: pharmacy2@test.com (MedLife Pharmacy)');
    console.log('   Password: Test@1234 (for all)');
    console.log('\n📊 Data Created:');
    console.log(`   • ${users.patients.length + users.hospitals.length + users.doctors.length + users.labs.length + users.pharmacies.length + 1} Users (all roles)`);
    console.log(`   • ${bookings.length} Bookings (confirmed & completed)`);
    console.log(`   • ${consultations.length} Consultations (with messages)`);
    console.log(`   • ${documents.length} Documents (lab reports & prescriptions)`);
    console.log(`   • ${consentRequests.length} Consent Requests`);
    console.log(`   • ${prescriptions.length} Prescriptions (active medications)`);
    console.log(`   • ${referrals.length} Referrals (doctor to lab)`);
    console.log(`   • ${slots.length} Slots (available for booking)`);
    console.log(`   • ${payments.length} Payments (completed transactions)`);
    console.log(`   • Complete profile data for testing`);
    console.log('\n' + '='.repeat(50));
    console.log('💡 You can now login and test all flows!');
    console.log('=' .repeat(50) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run the seeder
seedDatabase();

module.exports = mongoose;

import mongoose from 'mongoose';
import User from '../models/User.model.js';

const MONGODB_URI = 'mongodb+srv://arogyafirst01_db_user:jQi8mcB9eYP8FL2r@cluster0.kgrwhjd.mongodb.net/arogyafirst';

mongoose.connect(MONGODB_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Update hospital1
  await User.findOneAndUpdate(
    { email: 'hospital1@test.com' },
    {
      $set: {
        'hospitalData.doctors': [
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
        'hospitalData.labs': [
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
        'hospitalData.pharmacies': [
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
        'hospitalData.beds': [
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
        'hospitalData.staff': [
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
      }
    }
  );
  
  console.log('✅ Updated Hospital 1');
  
  // Update hospital2
  await User.findOneAndUpdate(
    { email: 'hospital2@test.com' },
    {
      $set: {
        'hospitalData.doctors': [
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
        'hospitalData.labs': [
          {
            name: 'Fortis Diagnostics',
            type: 'Full Service',
            location: 'Main Building, 2nd Floor',
            contactPhone: '9876543260',
            availableTests: ['Blood Test', 'MRI', 'CT Scan', 'X-Ray', 'Ultrasound', 'PET Scan'],
            isActive: true,
          },
        ],
        'hospitalData.pharmacies': [
          {
            name: 'Fortis Pharmacy',
            location: 'Main Lobby',
            contactPhone: '9876543270',
            operatingHours: '8AM - 10PM',
            isActive: true,
          },
        ],
        'hospitalData.beds': [
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
        'hospitalData.staff': [
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
      }
    }
  );
  
  console.log('✅ Updated Hospital 2');
  
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

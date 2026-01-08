import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/arogyafirst';

const dropBadIndex = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    
    // Drop the entire users collection to clear all indexes
    try {
      await db.collection('users').drop();
      console.log('✅ Dropped users collection');
    } catch (error) {
      if (error.message.includes('ns not found')) {
        console.log('ℹ️  Collection does not exist (may have been already dropped)');
      } else {
        throw error;
      }
    }

    await mongoose.disconnect();
    console.log('✅ Done - Ready for seeding');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

dropBadIndex();

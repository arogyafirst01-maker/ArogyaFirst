const Slot = require('../models/Slot.model.js');

/**
 * Migrate database indexes to fix duplicate key errors
 * Drops old indexes and recreates them with updated partialFilterExpression
 */
async function migrateIndexes() {
  try {
    console.log('🔄 Starting index migration...');
    
    // Drop the old problematic unique index if it exists
    const collection = Slot.collection;
    const indexInfo = await collection.getIndexes();
    
    // Look for the old index with providerId, entityType, date, startTime, endTime
    const oldIndexName = 'providerId_1_entityType_1_date_1_startTime_1_endTime_1';
    
    if (indexInfo[oldIndexName]) {
      console.log(`📌 Dropping old index: ${oldIndexName}`);
      await collection.dropIndex(oldIndexName);
      console.log(`✅ Old index dropped`);
    }
    
    // Force index recreation by calling collection.syncIndexes()
    // This will recreate all indexes defined in the schema
    await Slot.syncIndexes();
    console.log('✅ Indexes synchronized successfully');
    
  } catch (error) {
    console.error('❌ Index migration error:', error.message);
    // Don't fail the server startup due to index issues
    // The indexes will be created on first document save if needed
  }
}

module.exports = { migrateIndexes };

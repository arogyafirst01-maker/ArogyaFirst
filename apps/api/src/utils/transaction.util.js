const mongoose = require('mongoose');
let transactionSupportCache = null;

async function checkTransactionSupport() {
  if (transactionSupportCache !== null) {
    return transactionSupportCache;
  }
  // Allow explicit override via ENABLE_TRANSACTIONS env var (true/false)
  const envVal = process.env.ENABLE_TRANSACTIONS;
  if (typeof envVal !== 'undefined') {
    const v = String(envVal).trim().toLowerCase();
    if (v === 'true') {
      transactionSupportCache = true;
      return true;
    }
    if (v === 'false') {
      transactionSupportCache = false;
      return false;
    }
    // if set but unparsable, fall through to auto-detection
  }

  try {
    const admin = mongoose.connection.db.admin();
    const status = await admin.serverStatus();

    // Check if it's a replica set or sharded cluster
    const isReplicaSet = status.repl && status.repl.setName;
    const isSharded = status.sharding && status.sharding.configsvrConnectionString;

    transactionSupportCache = Boolean(isReplicaSet || isSharded);
    return transactionSupportCache;
  } catch (error) {
    console.error('Error checking transaction support:', error);
    transactionSupportCache = false;
    return false;
  }
}

/**
 * Execute callback within a MongoDB transaction if supported, otherwise execute without transaction.
 * 
 * IMPORTANT: When transactions are not supported (ENABLE_TRANSACTIONS=false or no replica set),
 * the callback will still execute but multi-document updates will NOT be atomic. This means:
 * - Partial updates may occur if an error happens mid-execution
 * - Race conditions may occur with concurrent requests
 * - Data consistency is not guaranteed across multiple collections
 * 
 * For production deployments, ALWAYS use a MongoDB replica set and set ENABLE_TRANSACTIONS=true
 * to ensure true atomic behavior. See docs/DEPLOYMENT.md for setup instructions.
 * 
 * @param {Function} callback - Async function to execute, receives session parameter (or null)
 * @returns {Promise<any>} Result from callback
 */
async function withTransaction(callback) {
  const supportsTransactions = await checkTransactionSupport();
  
  if (supportsTransactions) {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      const result = await callback(session);
      await session.commitTransaction();
      session.endSession();
      return result;
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error('Transaction failed:', error);
      throw error;
    }
  } else {
    console.error(
      'WARNING: Transactions not supported - executing without atomicity guarantee. ' +
      'Multi-document updates may be partially applied on error. ' +
      'Set up MongoDB replica set and ENABLE_TRANSACTIONS=true for production. ' +
      'See docs/DEPLOYMENT.md for instructions.'
    );
    return await callback(null);
  }
}

async function atomicSlotBooking(slotId, increment = 1, timeSlot = null, session = null) {
  try {
    const Slot = mongoose.model('Slot');
    const inc = Number(increment) || 0;

    // Read the slot within the provided session (if any) to validate capacity
    const slot = session ? await Slot.findById(slotId).session(session) : await Slot.findById(slotId);
    if (!slot || !slot.isActive) return null;

    // If updating a sub-timeSlot
    if (timeSlot && timeSlot.startTime && timeSlot.endTime) {
      const matching = slot.timeSlots?.find(ts => ts.startTime === timeSlot.startTime && ts.endTime === timeSlot.endTime);
      if (!matching) return null;

      if (inc > 0) {
        if ((matching.booked || 0) + inc > matching.capacity) return null;
      } else if (inc < 0) {
        if ((matching.booked || 0) < Math.abs(inc)) return null;
      } else {
        return null;
      }

      // Safe to perform update within same session
      const update = await Slot.findOneAndUpdate(
        { _id: slotId },
        { $inc: { 'timeSlots.$[elem].booked': inc, availableCapacity: -inc } },
        {
          arrayFilters: [{ 'elem.startTime': timeSlot.startTime, 'elem.endTime': timeSlot.endTime }],
          new: true,
          session: session || undefined
        }
      );
      return update;
    }

    // Single-range slot
    if (inc > 0) {
      if ((slot.capacity || 0) - (slot.booked || 0) < inc) return null;
    } else if (inc < 0) {
      if ((slot.booked || 0) < Math.abs(inc)) return null;
    } else {
      return null;
    }

    const result = await Slot.findOneAndUpdate(
      { _id: slotId },
      { $inc: { booked: inc, availableCapacity: -inc } },
      { new: true, session: session || undefined }
    );
    return result;
  } catch (error) {
    console.error('Atomic slot booking failed:', error);
    return null;
  }
}

module.exports = { checkTransactionSupport, withTransaction, atomicSlotBooking };

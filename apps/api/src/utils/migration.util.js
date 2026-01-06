const User = require('../models/User.model.js');const Slot = require('../models/Slot.model.js');const { ROLES, BOOKING_TYPES } = require('@arogyafirst/shared');
async function migrateDoctorSlots() {
  const doctors = await User.find({ role: ROLES.DOCTOR, 'doctorData.slots': { $exists: true, $ne: [] } });
  let totalDoctors = 0;
  let totalSlots = 0;
  const errors = [];
  const defaultAdvanceDays = Number(process.env.DEFAULT_ADVANCE_BOOKING_DAYS || 30);

  for (const doctor of doctors) {
    let migratedForDoctor = 0;
    for (const slot of doctor.doctorData.slots) {
      try {
        // Basic validation and normalization before saving so model hooks still run
        if (!doctor._id) throw new Error('Missing doctor id');
        const normalizedDate = slot.date ? new Date(slot.date) : null;
        if (normalizedDate) normalizedDate.setUTCHours(0, 0, 0, 0);

        // Ensure booked does not exceed capacity and is not negative
        let booked = Number(slot.booked) || 0;
        const capacity = Number(slot.capacity) || 1;
        if (booked < 0) booked = 0;
        if (booked > capacity) booked = capacity;

        const newSlot = new Slot({
          providerId: doctor._id,
          providerRole: ROLES.DOCTOR,
          entityType: BOOKING_TYPES.OPD,
          date: normalizedDate,
          startTime: slot.startTime,
          endTime: slot.endTime,
          capacity,
          booked,
          isActive: slot.isActive === undefined ? true : !!slot.isActive,
          advanceBookingDays: Number(slot.advanceBookingDays ?? defaultAdvanceDays),
          metadata: { consultationType: slot.consultationType },
          createdBy: doctor._id,
          updatedBy: doctor._id
        });

        await newSlot.save();
        migratedForDoctor++;
        totalSlots++;
      } catch (error) {
        errors.push({ doctorId: doctor._id, slot: slot, error: error.message });
      }
    }
    if (migratedForDoctor > 0) totalDoctors++;
    if (migratedForDoctor > 0) console.log(`Migrated ${migratedForDoctor} slots for doctor ${doctor._id}`);
  }
  return { totalDoctors, totalSlots, errors };
}

async function verifyMigration() {
  const doctorsWithSlots = await User.countDocuments({ role: ROLES.DOCTOR, 'doctorData.slots': { $exists: true, $ne: [] } });
  const slotCount = await Slot.countDocuments({ providerRole: ROLES.DOCTOR });
  return {
    doctorsWithEmbeddedSlots: doctorsWithSlots,
    migratedSlots: slotCount,
    migrationComplete: doctorsWithSlots === 0 && slotCount > 0
  };
}

async function rollbackMigration() {
  await Slot.deleteMany({ providerRole: ROLES.DOCTOR });
  console.log('Rolled back migration by deleting all doctor slots');
}

module.exports = { migrateDoctorSlots, verifyMigration, rollbackMigration };

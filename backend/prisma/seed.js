import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database: Removing all demo farmers, cattle, and inseminations...');

  // 1. Delete all demo insemination records
  const deletedInseminations = await prisma.inseminationRecord.deleteMany({});
  console.log(`🗑️ Removed ${deletedInseminations.count} insemination records`);

  // 2. Delete all demo cows
  const deletedCows = await prisma.cow.deleteMany({});
  console.log(`🗑️ Removed ${deletedCows.count} cow records`);

  // 3. Delete all demo farmers
  const deletedFarmers = await prisma.farmer.deleteMany({});
  console.log(`🗑️ Removed ${deletedFarmers.count} farmer records`);

  // 4. Remove any duplicate/legacy accounts (strictly single doctor system)
  await prisma.user.deleteMany({
    where: { email: 'admin@vetassist.com' },
  });

  // Ensure Single Doctor Account is clean and active
  const existingUsers = await prisma.user.findMany();
  const doctorPassword = await bcrypt.hash('Doctor@123', 12);

  if (existingUsers.length === 0) {
    await prisma.user.create({
      data: {
        email: 'doctor@vetassist.com',
        passwordHash: doctorPassword,
        name: 'Doctor',
        phone: '',
        specialization: 'Bovine Veterinary Specialist',
        role: 'DOCTOR',
      },
    });
    console.log('✅ Clean Single Doctor account created: doctor@vetassist.com / Doctor@123');
  } else {
    // Reset demo name and dummy phone to clean practitioner defaults, keeping credentials intact
    await prisma.user.update({
      where: { id: existingUsers[0].id },
      data: {
        name: 'Doctor',
        phone: '',
        specialization: 'Bovine Veterinary Specialist',
      },
    });
    console.log(`✅ Doctor account cleaned: ${existingUsers[0].email}`);
  }

  // 5. Ensure Default Clinic Settings are clean (no demo address or fake website)
  await prisma.clinicSetting.upsert({
    where: { id: 'default' },
    update: {
      clinicName: 'VetAssist Cattle AI Clinic',
      address: '',
      phone: '',
      email: 'doctor@vetassist.com',
      website: '',
      doctorName: 'Doctor',
      currency: 'INR',
      theme: 'light',
    },
    create: {
      id: 'default',
      clinicName: 'VetAssist Cattle AI Clinic',
      address: '',
      phone: '',
      email: 'doctor@vetassist.com',
      website: '',
      doctorName: 'Doctor',
      currency: 'INR',
      theme: 'light',
    },
  });

  console.log('✅ Clean clinic settings established');
  console.log('✨ Database is now 100% clean with zero demo data. Ready for real clinic records!');
}

main()
  .catch((e) => {
    console.error('❌ Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import prisma from '../src/config/db.js';
import { normalizePhoneNumber } from '../src/utils/phone.js';

async function main() {
  console.log('--- Normalizing Farmers Phone Numbers ---');
  const farmers = await prisma.farmer.findMany();
  for (const f of farmers) {
    const normalized = normalizePhoneNumber(f.mobile);
    if (normalized && normalized !== f.mobile) {
      console.log(`Normalizing farmer ${f.name}: "${f.mobile}" -> "${normalized}"`);
      await prisma.farmer.update({
        where: { id: f.id },
        data: { mobile: normalized },
      });
    } else {
      console.log(`Farmer ${f.name} mobile already clean: "${f.mobile}"`);
    }
  }

  console.log('\n--- Normalizing Insemination Records Mobile Numbers ---');
  const records = await prisma.inseminationRecord.findMany();
  for (const r of records) {
    const normalized = normalizePhoneNumber(r.farmerMobile);
    if (normalized && normalized !== r.farmerMobile) {
      console.log(`Normalizing record ${r.receiptNumber}: "${r.farmerMobile}" -> "${normalized}"`);
      await prisma.inseminationRecord.update({
        where: { id: r.id },
        data: { farmerMobile: normalized },
      });
    } else {
      console.log(`Record ${r.receiptNumber} mobile already clean: "${r.farmerMobile}"`);
    }
  }
  console.log('\nDone!');
}

main().catch(console.error).finally(() => prisma.$disconnect());

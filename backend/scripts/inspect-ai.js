import prisma from '../src/config/db.js';

async function main() {
  const records = await prisma.inseminationRecord.findMany({
    include: { farmer: true }
  });
  console.log('RECORDS_COUNT:', records.length);
  for (const r of records) {
    console.log({
      id: r.id,
      receiptNumber: r.receiptNumber,
      farmerMobile: r.farmerMobile,
      farmerName: r.farmerName,
      whatsappStatus: r.whatsappStatus,
      whatsappError: r.whatsappError,
      whatsappMessageId: r.whatsappMessageId
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

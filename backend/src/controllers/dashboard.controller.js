import prisma from '../config/db.js';

export async function getDashboardStats(req, res, next) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const startOfMonthStr = todayStr.slice(0, 7) + '-01';

    // 1. Total counts
    const [totalFarmers, cowCount, totalInseminations] = await Promise.all([
      prisma.farmer.count(),
      prisma.cow.count(),
      prisma.inseminationRecord.count(),
    ]);

    // Compute total cows (aggregate cowsOwned or cow records count)
    const farmerSum = await prisma.farmer.aggregate({
      _sum: { cowsOwned: true },
    });
    const totalCows = Math.max(cowCount, farmerSum._sum.cowsOwned || 0);

    // 2. Today's Inseminations & Cows Served
    const todayRecords = await prisma.inseminationRecord.findMany({
      where: { date: todayStr },
      select: { cowCount: true },
    });
    const inseminationsToday = todayRecords.length;
    const cowsInseminatedToday = todayRecords.reduce((sum, r) => sum + r.cowCount, 0);

    // 3. This Month's Inseminations
    const monthRecords = await prisma.inseminationRecord.findMany({
      where: { date: { gte: startOfMonthStr } },
      select: { cowCount: true },
    });
    const inseminationsThisMonth = monthRecords.length;
    const cowsInseminatedThisMonth = monthRecords.reduce((sum, r) => sum + r.cowCount, 0);

    // 4. Insemination Trend over the last 14 days
    const trendMap = {};
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = 0;
    }

    const pastTwoWeeksRecords = await prisma.inseminationRecord.findMany({
      where: {
        date: { gte: Object.keys(trendMap)[0] },
      },
      select: { date: true, cowCount: true },
    });

    pastTwoWeeksRecords.forEach((r) => {
      if (trendMap[r.date] !== undefined) {
        trendMap[r.date] += r.cowCount;
      }
    });

    const inseminationsTrend = Object.entries(trendMap).map(([date, count]) => {
      const d = new Date(date);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { date, label, count };
    });

    // 5. Breed Distribution
    const cows = await prisma.cow.findMany({
      select: { breed: true },
    });
    const breedMap = {};
    cows.forEach((c) => {
      const b = c.breed || 'Gir';
      breedMap[b] = (breedMap[b] || 0) + 1;
    });
    const breedDistribution = Object.entries(breedMap).map(([name, value]) => ({ name, value }));

    // 6. Recent Insemination Records
    const recentInseminations = await prisma.inseminationRecord.findMany({
      take: 6,
      orderBy: [{ date: 'desc' }, { time: 'desc' }],
      select: {
        id: true,
        receiptNumber: true,
        farmerId: true,
        farmerName: true,
        farmerMobile: true,
        doctorName: true,
        date: true,
        time: true,
        cowCount: true,
        strawCode: true,
        whatsappStatus: true,
      },
    });

    // 7. Recent Farmers
    const recentFarmers = await prisma.farmer.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        mobile: true,
        cowsOwned: true,
        village: true,
      },
    });

    res.json({
      success: true,
      data: {
        totalFarmers,
        totalCows,
        inseminationsToday,
        cowsInseminatedToday,
        inseminationsThisMonth,
        cowsInseminatedThisMonth,
        totalInseminations,
        inseminationsTrend,
        breedDistribution,
        recentInseminations,
        recentFarmers,
      },
    });
  } catch (error) {
    next(error);
  }
}

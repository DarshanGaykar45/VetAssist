import prisma from '../config/db.js';

export async function getInseminationAnalytics(req, res, next) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);
    const currentMonth = todayStr.slice(0, 7); // e.g. "2026-09"

    // 1. Daily Inseminations (Today)
    const todayRecords = await prisma.inseminationRecord.findMany({
      where: { date: todayStr },
      include: {
        farmer: {
          select: { id: true, name: true, mobile: true, village: true },
        },
      },
      orderBy: { time: 'asc' },
    });

    const dailySummary = {
      date: todayStr,
      totalVisits: todayRecords.length,
      totalCows: todayRecords.reduce((sum, r) => sum + r.cowCount, 0),
      records: todayRecords,
    };

    // 2. Monthly Insemination Breakdown
    const allRecords = await prisma.inseminationRecord.findMany({
      orderBy: { date: 'asc' },
    });

    // Month-by-month totals (last 6 months)
    const monthTotalsMap = {};
    allRecords.forEach((r) => {
      const monthKey = r.date.slice(0, 7);
      if (!monthTotalsMap[monthKey]) {
        monthTotalsMap[monthKey] = { month: monthKey, visits: 0, cows: 0 };
      }
      monthTotalsMap[monthKey].visits += 1;
      monthTotalsMap[monthKey].cows += r.cowCount;
    });

    const monthTotals = Object.values(monthTotalsMap);

    // Days in current month breakdown
    const currentMonthRecords = allRecords.filter((r) => r.date.startsWith(currentMonth));
    const daysInMonthMap = {};
    currentMonthRecords.forEach((r) => {
      const day = r.date;
      daysInMonthMap[day] = (daysInMonthMap[day] || 0) + r.cowCount;
    });

    const dailyTrend = Object.entries(daysInMonthMap).map(([date, count]) => ({
      date,
      day: parseInt(date.slice(8), 10),
      count,
    }));

    // 3. Top Farmers by Insemination Volume
    const farmerVolumeMap = {};
    allRecords.forEach((r) => {
      if (!farmerVolumeMap[r.farmerId]) {
        farmerVolumeMap[r.farmerId] = {
          farmerId: r.farmerId,
          farmerName: r.farmerName,
          farmerMobile: r.farmerMobile,
          visits: 0,
          cowsInseminated: 0,
        };
      }
      farmerVolumeMap[r.farmerId].visits += 1;
      farmerVolumeMap[r.farmerId].cowsInseminated += r.cowCount;
    });

    const topFarmers = Object.values(farmerVolumeMap)
      .sort((a, b) => b.cowsInseminated - a.cowsInseminated)
      .slice(0, 10);

    // 4. WhatsApp Receipt Delivery Metrics
    const whatsappMetrics = {
      sent: allRecords.filter((r) => r.whatsappStatus === 'sent').length,
      failed: allRecords.filter((r) => r.whatsappStatus === 'failed' || r.whatsappStatus === 'sandbox_not_joined').length,
      pending: allRecords.filter((r) => r.whatsappStatus === 'pending').length,
    };

    // 5. Overall Totals
    const totalFarmers = await prisma.farmer.count();
    const totalCows = await prisma.cow.count();

    res.json({
      success: true,
      data: {
        dailySummary,
        monthTotals,
        dailyTrend,
        topFarmers,
        whatsappMetrics,
        summary: {
          totalFarmers,
          totalCows,
          totalInseminations: allRecords.length,
          totalCowsInseminated: allRecords.reduce((sum, r) => sum + r.cowCount, 0),
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

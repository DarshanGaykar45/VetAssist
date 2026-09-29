import prisma from '../config/db.js';
import { formatReceiptMessage, generateWhatsAppDeepLink } from '../services/whatsapp.service.js';
import { normalizePhoneNumber } from '../utils/phone.js';

/**
 * Generate unique, sequential receipt number for Insemination records (e.g. AI-2026-0042)
 */
async function generateReceiptNumber() {
  const currentYear = new Date().getFullYear();
  const count = await prisma.inseminationRecord.count();
  const nextNum = (count + 1).toString().padStart(4, '0');
  let candidate = `AI-${currentYear}-${nextNum}`;

  // Ensure uniqueness
  let exists = await prisma.inseminationRecord.findUnique({ where: { receiptNumber: candidate } });
  let counter = count + 1;
  while (exists) {
    counter++;
    candidate = `AI-${currentYear}-${counter.toString().padStart(4, '0')}`;
    exists = await prisma.inseminationRecord.findUnique({ where: { receiptNumber: candidate } });
  }

  return candidate;
}

/**
 * Get all insemination records with filters
 */
export async function getInseminations(req, res, next) {
  try {
    const { farmerId, search, startDate, endDate } = req.query;

    const where = {};
    if (farmerId) where.farmerId = farmerId;
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else if (startDate) {
      where.date = { gte: startDate };
    } else if (endDate) {
      where.date = { lte: endDate };
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { receiptNumber: { contains: q } },
        { farmerName: { contains: q } },
        { farmerMobile: { contains: q } },
        { notes: { contains: q } },
        { strawCode: { contains: q } },
      ];
    }

    const records = await prisma.inseminationRecord.findMany({
      where,
      include: {
        farmer: {
          select: { id: true, name: true, mobile: true, village: true, cowsOwned: true },
        },
      },
      orderBy: [{ date: 'desc' }, { time: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single insemination record by ID
 */
export async function getInseminationById(req, res, next) {
  try {
    const { id } = req.params;

    const record = await prisma.inseminationRecord.findUnique({
      where: { id },
      include: {
        farmer: true,
      },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Insemination record not found.' });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Record a new artificial insemination visit + automatically send WhatsApp receipt
 */
export async function createInsemination(req, res, next) {
  try {
    const {
      farmerId,
      farmerClientId,
      clientId,
      date,
      time,
      cowCount = 1,
      cowTags,
      strawCode,
      notes,
    } = req.body;

    const rawClientId = clientId?.trim() || req.body.client_id?.trim() || null;

    // 0. Idempotency check: if record with clientId already exists, return it safely (200 OK)
    if (rawClientId) {
      const existing = await prisma.inseminationRecord.findFirst({
        where: { clientId: rawClientId },
        include: { farmer: true },
      });
      if (existing) {
        const clinic = await prisma.clinicSetting.findUnique({ where: { id: 'default' } });
        const doctorUser = await prisma.user.findFirst({ where: { role: 'DOCTOR' } });
        const doctorName = existing.doctorName || clinic?.doctorName || doctorUser?.name || 'Doctor';
        const doctorPhone = req.user?.phone || doctorUser?.phone || '';
        const clinicName = clinic?.clinicName || 'VetAssist Cattle AI Clinic';
        const clinicPhone = clinic?.phone || doctorPhone || '';

        const receiptText = formatReceiptMessage({
          clinicName,
          doctorName,
          phone: clinicPhone,
          doctorPhone,
          receiptNumber: existing.receiptNumber,
          farmerName: existing.farmerName,
          date: existing.date,
          time: existing.time,
          cowCount: existing.cowCount,
          strawCode: existing.strawCode,
          notes: existing.notes,
        });

        const whatsappLink = generateWhatsAppDeepLink({
          phone: existing.farmerMobile,
          text: receiptText,
        });

        return res.status(200).json({
          success: true,
          message: `Insemination record already exists (Receipt #${existing.receiptNumber}).`,
          data: existing,
          receiptText,
          whatsappLink,
        });
      }
    }

    const targetFarmerRef =
      farmerClientId ||
      farmerId ||
      req.body.farmer_id ||
      (typeof req.body.farmer === 'object' ? req.body.farmer?.id : req.body.farmer);

    if (!targetFarmerRef) {
      return res.status(400).json({ success: false, message: 'Farmer selection is required.' });
    }

    // Resolve farmer by database ID or clientId (if created offline during the same sync batch)
    const farmer = await prisma.farmer.findFirst({
      where: {
        OR: [
          { id: targetFarmerRef },
          { clientId: targetFarmerRef },
        ],
      },
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Selected farmer does not exist.' });
    }

    const resolvedFarmerId = farmer.id;

    const rawDate = date || req.body.inseminationDate;
    if (!rawDate) {
      return res.status(400).json({ success: false, message: 'Insemination date is required.' });
    }

    // Format date reliably as YYYY-MM-DD
    let formattedDate;
    if (rawDate instanceof Date) {
      formattedDate = rawDate.toISOString().slice(0, 10);
    } else if (typeof rawDate === 'string') {
      formattedDate = rawDate.trim();
      if (formattedDate.includes('T')) {
        formattedDate = formattedDate.split('T')[0];
      }
    } else {
      formattedDate = new Date(rawDate).toISOString().slice(0, 10);
    }

    // Format time reliably as HH:mm
    const rawTime = time || req.body.inseminationTime || '10:00';
    let formattedTime = typeof rawTime === 'string' ? rawTime.trim() : '10:00';
    if (formattedTime.length > 5) {
      formattedTime = formattedTime.slice(0, 5);
    }

    const parsedCount = parseInt(cowCount !== undefined ? cowCount : req.body.cowsInseminated, 10);
    const count = isNaN(parsedCount) || parsedCount < 1 ? 1 : parsedCount;

    // Auto-fill doctor name and phone from logged-in session, with fallback to settings
    const clinic = await prisma.clinicSetting.findUnique({ where: { id: 'default' } });
    const doctorUser = await prisma.user.findFirst({ where: { role: 'DOCTOR' } });
    const doctorName = req.user?.name || clinic?.doctorName || doctorUser?.name || 'Doctor';
    const doctorPhone = req.user?.phone || doctorUser?.phone || '';
    const clinicName = clinic?.clinicName || 'VetAssist Cattle AI Clinic';
    const clinicPhone = clinic?.phone || doctorPhone || '';

    const receiptNumber = await generateReceiptNumber();

    const normalizedMobile = normalizePhoneNumber(farmer.mobile) || farmer.mobile;

    // 1. Save permanently to database (Always succeeds regardless of WhatsApp)
    const record = await prisma.inseminationRecord.create({
      data: {
        clientId: rawClientId,
        receiptNumber,
        farmerId: resolvedFarmerId,
        farmerName: farmer.name,
        farmerMobile: normalizedMobile,
        doctorName,
        date: formattedDate,
        time: formattedTime,
        cowCount: count,
        cowTags: cowTags?.trim() || null,
        strawCode: strawCode?.trim() || null,
        notes: notes?.trim() || null,
        whatsappStatus: 'pending',
      },
      include: {
        farmer: true,
      },
    });

    // 2. Generate formatted receipt text and WhatsApp deep link (zero-dependency wa.me)
    const receiptText = formatReceiptMessage({
      clinicName,
      doctorName,
      phone: clinicPhone,
      doctorPhone,
      receiptNumber,
      farmerName: farmer.name,
      date: record.date,
      time: record.time,
      cowCount: record.cowCount,
      strawCode: record.strawCode,
      notes: record.notes,
    });

    const whatsappLink = generateWhatsAppDeepLink({
      phone: farmer.mobile,
      text: receiptText,
    });

    // Always return HTTP 201 with record, formatted receipt text, and ready-to-open WhatsApp link
    res.status(201).json({
      success: true,
      message: `Insemination saved permanently (Receipt #${receiptNumber})!`,
      data: record,
      receiptText,
      whatsappLink,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Generate fresh WhatsApp deep link and formatted receipt for an existing insemination record
 */
export async function resendWhatsApp(req, res, next) {
  try {
    const { id } = req.params;

    const record = await prisma.inseminationRecord.findUnique({
      where: { id },
      include: { farmer: true },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: 'Insemination record not found.' });
    }

    const clinic = await prisma.clinicSetting.findUnique({ where: { id: 'default' } });
    const doctorUser = await prisma.user.findFirst({ where: { role: 'DOCTOR' } });
    const doctorPhone = req.user?.phone || doctorUser?.phone || '';
    const clinicName = clinic?.clinicName || 'VetAssist Cattle AI Clinic';
    const clinicPhone = clinic?.phone || doctorPhone || '+91 98765 43210';

    const targetMobile = normalizePhoneNumber(record.farmerMobile || record.farmer?.mobile);

    const receiptText = formatReceiptMessage({
      clinicName,
      doctorName: record.doctorName,
      phone: clinicPhone,
      doctorPhone,
      receiptNumber: record.receiptNumber,
      farmerName: record.farmerName || record.farmer?.name,
      date: record.date,
      time: record.time,
      cowCount: record.cowCount,
      strawCode: record.strawCode,
      notes: record.notes,
    });

    const whatsappLink = generateWhatsAppDeepLink({
      phone: targetMobile,
      text: receiptText,
    });

    return res.json({
      success: true,
      message: 'WhatsApp deep link generated successfully.',
      data: record,
      receiptText,
      whatsappLink,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Toggle "Marked as sent" status for an insemination record (manual record-keeping)
 */
export async function toggleSentStatus(req, res, next) {
  try {
    const { id } = req.params;

    const record = await prisma.inseminationRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Insemination record not found.' });
    }

    const newStatus = record.whatsappStatus === 'sent' ? 'pending' : 'sent';
    const updated = await prisma.inseminationRecord.update({
      where: { id },
      data: {
        whatsappStatus: newStatus,
        whatsappSentAt: newStatus === 'sent' ? new Date() : null,
      },
      include: { farmer: true },
    });

    res.json({
      success: true,
      message: `Receipt marked as ${newStatus === 'sent' ? 'Sent' : 'Pending'}.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

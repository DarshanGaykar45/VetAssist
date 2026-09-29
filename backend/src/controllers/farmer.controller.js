import prisma from '../config/db.js';
import { normalizePhoneNumber } from '../utils/phone.js';

/**
 * Get all farmers with search, linked cows, and insemination counts
 */
export async function getFarmers(req, res, next) {
  try {
    const { search } = req.query;

    const where = {};
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { village: { contains: q } },
      ];
    }

    const farmers = await prisma.farmer.findMany({
      where,
      include: {
        cows: {
          select: {
            id: true,
            tagNumber: true,
            name: true,
            breed: true,
            gender: true,
            age: true,
            purpose: true,
            lactationNumber: true,
            notes: true,
          },
        },
        inseminations: {
          select: {
            id: true,
            receiptNumber: true,
            date: true,
            time: true,
            cowCount: true,
            whatsappStatus: true,
          },
          orderBy: { date: 'desc' },
          take: 5,
        },
        _count: {
          select: { cows: true, inseminations: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: farmers,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get single farmer by ID with full cow and insemination history
 */
export async function getFarmerById(req, res, next) {
  try {
    const { id } = req.params;

    const farmer = await prisma.farmer.findUnique({
      where: { id },
      include: {
        cows: true,
        inseminations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer record not found.' });
    }

    res.json({
      success: true,
      data: farmer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new farmer record with optional cows list
 */
export async function createFarmer(req, res, next) {
  try {
    const { name, mobile, cowsOwned, village, notes, clientId, cows = [] } = req.body;

    const rawClientId = clientId?.trim() || req.body.client_id?.trim() || null;

    // Idempotency check: if clientId already registered, return existing record with 200 OK
    if (rawClientId) {
      const existingByClientId = await prisma.farmer.findFirst({
        where: { clientId: rawClientId },
        include: { cows: true },
      });
      if (existingByClientId) {
        return res.status(200).json({
          success: true,
          message: 'Farmer already registered (idempotent sync).',
          data: existingByClientId,
        });
      }
    }

    const rawName = name || req.body.farmerName;
    const rawMobile = mobile || req.body.phone || req.body.mobileNumber || req.body.phoneNumber;
    const rawCowsOwned = cowsOwned !== undefined ? cowsOwned : (req.body.cattleCount !== undefined ? req.body.cattleCount : req.body.cows_owned);

    if (!rawName || !rawName.trim()) {
      return res.status(400).json({ success: false, message: 'Farmer name is required.' });
    }
    if (!rawMobile || !rawMobile.trim()) {
      return res.status(400).json({ success: false, message: 'Farmer mobile number is required.' });
    }

    const cleanMobile = normalizePhoneNumber(rawMobile);
    if (!cleanMobile) {
      return res.status(400).json({ success: false, message: 'Invalid mobile number format. Please provide a valid phone number.' });
    }

    const existing = await prisma.farmer.findUnique({
      where: { mobile: cleanMobile },
      include: { cows: true },
    });

    if (existing) {
      // If clientId was passed and existing farmer does not have a clientId, link it
      if (rawClientId && !existing.clientId) {
        const updated = await prisma.farmer.update({
          where: { id: existing.id },
          data: { clientId: rawClientId },
          include: { cows: true },
        });
        return res.status(200).json({
          success: true,
          message: `Farmer with mobile ${cleanMobile} already exists and is now linked.`,
          data: updated,
        });
      }
      return res.status(409).json({
        success: false,
        message: `A farmer with mobile number ${cleanMobile} already exists.`,
      });
    }

    const parsedCowsOwned = parseInt(rawCowsOwned, 10);
    const safeCowsOwned = isNaN(parsedCowsOwned) ? 0 : parsedCowsOwned;
    const effectiveCowsOwned = Math.max(safeCowsOwned, Array.isArray(cows) ? cows.length : 0);

    const farmer = await prisma.farmer.create({
      data: {
        clientId: rawClientId,
        name: rawName.trim(),
        mobile: cleanMobile,
        cowsOwned: effectiveCowsOwned,
        village: village?.trim() || null,
        notes: notes?.trim() || null,
        cows: {
          create: Array.isArray(cows)
            ? cows
                .filter((c) => c && (c.name || c.tagNumber || c.breed))
                .map((c) => ({
                  tagNumber: c.tagNumber?.trim() || null,
                  name: c.name?.trim() || null,
                  breed: c.breed?.trim() || 'Gir',
                  gender: c.gender?.trim() || 'Female',
                  purpose: c.purpose?.trim() || 'Dairy',
                  age: c.age && !isNaN(parseInt(c.age, 10)) ? parseInt(c.age, 10) : null,
                  lactationNumber: c.lactationNumber && !isNaN(parseInt(c.lactationNumber, 10)) ? parseInt(c.lactationNumber, 10) : 1,
                  color: c.color?.trim() || null,
                  notes: c.notes?.trim() || null,
                }))
            : [],
        },
      },
      include: {
        cows: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Farmer registered successfully.',
      data: farmer,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update farmer details
 */
export async function updateFarmer(req, res, next) {
  try {
    const { id } = req.params;
    const { name, mobile, cowsOwned, village, notes } = req.body;

    const rawName = name !== undefined ? name : req.body.farmerName;
    const rawMobile = mobile !== undefined ? mobile : (req.body.phone !== undefined ? req.body.phone : req.body.mobileNumber);
    const rawCowsOwned = cowsOwned !== undefined ? cowsOwned : (req.body.cattleCount !== undefined ? req.body.cattleCount : req.body.cows_owned);

    const existing = await prisma.farmer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Farmer not found.' });
    }

    let cleanMobile = existing.mobile;
    if (rawMobile !== undefined) {
      cleanMobile = normalizePhoneNumber(rawMobile);
      if (!cleanMobile) {
        return res.status(400).json({ success: false, message: 'Invalid mobile number format. Please provide a valid phone number.' });
      }
      if (cleanMobile !== existing.mobile) {
        const duplicate = await prisma.farmer.findUnique({ where: { mobile: cleanMobile } });
        if (duplicate && duplicate.id !== id) {
          return res.status(409).json({
            success: false,
            message: `Another farmer is already registered with mobile number ${cleanMobile}.`,
          });
        }
      }
    }

    let parsedCowsOwned = existing.cowsOwned;
    if (rawCowsOwned !== undefined) {
      const p = parseInt(rawCowsOwned, 10);
      parsedCowsOwned = isNaN(p) ? 0 : p;
    }

    const updated = await prisma.farmer.update({
      where: { id },
      data: {
        name: rawName !== undefined ? rawName.trim() : existing.name,
        mobile: cleanMobile,
        cowsOwned: parsedCowsOwned,
        village: village !== undefined ? village.trim() : existing.village,
        notes: notes !== undefined ? notes.trim() : existing.notes,
      },
      include: {
        cows: true,
        _count: { select: { cows: true, inseminations: true } },
      },
    });

    res.json({
      success: true,
      message: 'Farmer record updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a farmer record and linked cows
 */
export async function deleteFarmer(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await prisma.farmer.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Farmer not found.' });
    }

    await prisma.farmer.delete({ where: { id } });

    res.json({
      success: true,
      message: 'Farmer and associated records removed successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Add an individual cow under a specific farmer
 */
export async function addCowToFarmer(req, res, next) {
  try {
    const { id: farmerId } = req.params;
    const { tagNumber, name, breed = 'Gir', gender = 'Female', purpose = 'Dairy', age, lactationNumber = 1, color, notes } = req.body;

    const farmer = await prisma.farmer.findUnique({ where: { id: farmerId } });
    if (!farmer) {
      return res.status(404).json({ success: false, message: 'Farmer not found.' });
    }

    if (tagNumber && tagNumber.trim()) {
      const existingTag = await prisma.cow.findUnique({ where: { tagNumber: tagNumber.trim() } });
      if (existingTag) {
        return res.status(409).json({ success: false, message: `Ear tag '${tagNumber.trim()}' is already registered.` });
      }
    }

    const cow = await prisma.$transaction(async (tx) => {
      const newCow = await tx.cow.create({
        data: {
          farmerId,
          tagNumber: tagNumber?.trim() || null,
          name: name?.trim() || null,
          breed: breed.trim(),
          gender,
          purpose,
          age: age ? Number(age) : null,
          lactationNumber: Number(lactationNumber) || 1,
          color: color?.trim() || null,
          notes: notes?.trim() || null,
        },
      });

      // Update farmer's cow count if greater
      const totalCows = await tx.cow.count({ where: { farmerId } });
      if (totalCows > farmer.cowsOwned) {
        await tx.farmer.update({ where: { id: farmerId }, data: { cowsOwned: totalCows } });
      }

      return newCow;
    });

    res.status(201).json({
      success: true,
      message: 'Cow added to farmer successfully.',
      data: cow,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update an individual cow record
 */
export async function updateCow(req, res, next) {
  try {
    const { id: farmerId, cowId } = req.params;
    const { tagNumber, name, breed, gender, purpose, age, lactationNumber, color, notes } = req.body;

    const existingCow = await prisma.cow.findFirst({
      where: { id: cowId, farmerId },
    });
    if (!existingCow) {
      return res.status(404).json({ success: false, message: 'Cow record not found under this farmer.' });
    }

    if (tagNumber && tagNumber.trim() !== existingCow.tagNumber) {
      const duplicateTag = await prisma.cow.findUnique({ where: { tagNumber: tagNumber.trim() } });
      if (duplicateTag && duplicateTag.id !== cowId) {
        return res.status(409).json({ success: false, message: `Ear tag '${tagNumber.trim()}' is already in use.` });
      }
    }

    const updatedCow = await prisma.cow.update({
      where: { id: cowId },
      data: {
        tagNumber: tagNumber !== undefined ? tagNumber.trim() || null : existingCow.tagNumber,
        name: name !== undefined ? name.trim() || null : existingCow.name,
        breed: breed !== undefined ? breed.trim() : existingCow.breed,
        gender: gender !== undefined ? gender : existingCow.gender,
        purpose: purpose !== undefined ? purpose : existingCow.purpose,
        age: age !== undefined ? (age ? Number(age) : null) : existingCow.age,
        lactationNumber: lactationNumber !== undefined ? Number(lactationNumber) : existingCow.lactationNumber,
        color: color !== undefined ? color.trim() || null : existingCow.color,
        notes: notes !== undefined ? notes.trim() || null : existingCow.notes,
      },
    });

    res.json({
      success: true,
      message: 'Cow record updated successfully.',
      data: updatedCow,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete a cow record
 */
export async function deleteCow(req, res, next) {
  try {
    const { id: farmerId, cowId } = req.params;

    const existingCow = await prisma.cow.findFirst({
      where: { id: cowId, farmerId },
    });
    if (!existingCow) {
      return res.status(404).json({ success: false, message: 'Cow record not found under this farmer.' });
    }

    await prisma.cow.delete({ where: { id: cowId } });

    res.json({
      success: true,
      message: 'Cow record deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
}

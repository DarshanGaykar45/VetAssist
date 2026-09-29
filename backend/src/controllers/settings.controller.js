import prisma from '../config/db.js';

export async function getSettings(req, res, next) {
  try {
    let setting = await prisma.clinicSetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      setting = await prisma.clinicSetting.create({
        data: {
          id: 'default',
          clinicName: 'VetAssist Cattle AI Clinic',
          address: '45 Green Pasture Road, Anand, Gujarat 388001',
          phone: '+91 98765 43210',
          email: 'doctor@vetassist.com',
          website: 'https://vetassist.example.com',
          currency: 'INR',
          theme: 'light',
          doctorName: req.user?.name || 'Doctor',
        },
      });
    }

    res.json({
      success: true,
      data: {
        clinicName: setting.clinicName,
        address: setting.address,
        phone: setting.phone,
        email: setting.email,
        website: setting.website,
        currency: setting.currency,
        theme: setting.theme,
        doctorName: setting.doctorName || req.user?.name,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          specialization: req.user.specialization,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const {
      clinicName,
      address,
      phone,
      email,
      website,
      currency,
      theme,
      doctorName,
      user,
    } = req.body;

    const updateData = {};
    if (clinicName !== undefined) updateData.clinicName = clinicName;
    if (address !== undefined) updateData.address = address;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (website !== undefined) updateData.website = website;
    if (currency !== undefined) updateData.currency = currency;
    if (theme !== undefined) updateData.theme = theme;
    if (doctorName !== undefined) updateData.doctorName = doctorName;

    const updatedSetting = await prisma.clinicSetting.upsert({
      where: { id: 'default' },
      update: updateData,
      create: {
        id: 'default',
        clinicName: clinicName || 'VetAssist Cattle AI Clinic',
        address,
        phone,
        email,
        website,
        currency: currency || 'INR',
        theme: theme || 'light',
        doctorName: doctorName || user?.name || req.user?.name,
      },
    });

    // Update doctor's name / phone if submitted
    const userUpdate = {};
    if (doctorName || (user && user.name)) {
      userUpdate.name = (doctorName || user.name).trim();
    }
    if (user && user.phone) {
      userUpdate.phone = user.phone.trim();
    }
    if (user && user.specialization) {
      userUpdate.specialization = user.specialization.trim();
    }

    let updatedUser = null;
    if (Object.keys(userUpdate).length > 0) {
      updatedUser = await prisma.user.update({
        where: { id: req.user.id },
        data: userUpdate,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          specialization: true,
          role: true,
        },
      });
    }

    res.json({
      success: true,
      message: 'Clinic and Doctor settings saved successfully.',
      data: updatedSetting,
      user: updatedUser || {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        phone: req.user.phone,
        specialization: req.user.specialization,
      },
    });
  } catch (error) {
    next(error);
  }
}

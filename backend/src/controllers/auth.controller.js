import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db.js';

/**
 * SECURITY ARCHITECTURE NOTE:
 * This system is strictly designed for a solo veterinary practitioner.
 * There is NO public registration endpoint or UI registration route.
 * The single doctor account is provisioned once via the backend seed script.
 * 
 * Passwords are never stored in plain text; they are hashed using bcrypt with 12 salt rounds.
 * Authentication uses JSON Web Tokens (JWT) signed with a secret environment variable.
 * While no system is theoretically "unhackable", eliminating public account creation,
 * hashing passwords with high work factors, strictly validating input, and enforcing
 * JWT verification on all protected endpoints follows solid industry security best practices.
 */

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
      });
    }

    const secret = process.env.AUTH_SECRET || 'vetassist_dev_jwt_secret_cattle_clinic_2026_99401';
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        phone: user.phone,
        specialization: user.specialization,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        specialization: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required.',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Doctor account not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match.',
      });
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { passwordHash: newHash },
    });

    res.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update Login Email & Password for the single doctor account
 * Requires current password confirmation for security.
 * Updates the existing doctor account in place (no second account created).
 */
export async function updateCredentials(req, res, next) {
  try {
    const { currentPassword, newEmail, newPassword } = req.body;

    if (!currentPassword || !currentPassword.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Current password is required to authorize login credential changes.',
      });
    }

    if (!newEmail && !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a new login email, a new password, or both.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Doctor account not found.' });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match. Credential update denied.',
      });
    }

    const updateData = {};

    // Validate and prepare new email
    if (newEmail && newEmail.trim()) {
      const normalizedEmail = newEmail.toLowerCase().trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalizedEmail)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address.',
        });
      }

      if (normalizedEmail !== user.email) {
        const existing = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (existing && existing.id !== user.id) {
          return res.status(409).json({
            success: false,
            message: `The email address "${normalizedEmail}" is already in use.`,
          });
        }
        updateData.email = normalizedEmail;
      }
    }

    // Validate and prepare new password
    if (newPassword && newPassword.trim()) {
      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters long.',
        });
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'New email matches your current email and no new password was provided.',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        specialization: true,
      },
    });

    // If email changed, also update clinic default contact email if matched
    if (updateData.email) {
      await prisma.clinicSetting.updateMany({
        where: { id: 'default' },
        data: { email: updateData.email },
      });
    }

    // Generate fresh JWT token with updated email
    const secret = process.env.AUTH_SECRET || 'vetassist_dev_jwt_secret_cattle_clinic_2026_99401';
    const newToken = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
      secret,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      message: 'Doctor login credentials updated successfully. Please use your new email and password for future logins.',
      token: newToken,
      user: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}


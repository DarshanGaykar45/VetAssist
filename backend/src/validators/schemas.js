import { z } from 'zod';
import { normalizePhoneNumber } from '../utils/phone.js';

// Custom validator for mobile phone numbers (tolerant of Indian 10-digit, +91, with spaces/dashes)
const phoneSchema = z.string().trim().min(8, 'Phone number is too short').max(20, 'Phone number is too long').refine(
  (val) => {
    const normalized = normalizePhoneNumber(val);
    return normalized !== null && normalized.length >= 10;
  },
  { message: 'Invalid mobile phone number format.' }
);

// 1. Auth Schemas
export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Valid email address is required').max(100),
    password: z.string().min(1, 'Password is required').max(100),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long').max(100),
  }),
});

export const updateCredentialsSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required to authorize changes'),
    newEmail: z.string().trim().email('Valid new email address is required').max(100).optional().or(z.literal('')),
    newPassword: z.string().min(6, 'New password must be at least 6 characters long').max(100).optional().or(z.literal('')),
  }).refine((data) => data.newEmail || data.newPassword, {
    message: 'Please provide either a new email address or a new password.',
  }),
});

// 2. Farmer Schemas
export const createFarmerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'Farmer name is required').max(100).optional(),
    farmerName: z.string().trim().min(1).max(100).optional(),
    mobile: phoneSchema.optional(),
    phone: phoneSchema.optional(),
    mobileNumber: phoneSchema.optional(),
    phoneNumber: phoneSchema.optional(),
    cowsOwned: z.union([z.number().int().min(0), z.string().regex(/^\d+$/)]).optional(),
    cattleCount: z.union([z.number().int().min(0), z.string().regex(/^\d+$/)]).optional(),
    village: z.string().trim().max(100).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    clientId: z.string().trim().max(100).nullable().optional(),
    cows: z.array(z.any()).optional(),
  }).refine((data) => data.name || data.farmerName, {
    message: 'Farmer name is required.',
  }).refine((data) => data.mobile || data.phone || data.mobileNumber || data.phoneNumber, {
    message: 'Farmer mobile number is required.',
  }),
});

export const updateFarmerSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Farmer ID is required'),
  }),
  body: z.object({
    name: z.string().trim().min(1).max(100).optional(),
    farmerName: z.string().trim().min(1).max(100).optional(),
    mobile: phoneSchema.optional(),
    phone: phoneSchema.optional(),
    mobileNumber: phoneSchema.optional(),
    cowsOwned: z.union([z.number().int().min(0), z.string().regex(/^\d+$/)]).optional(),
    cattleCount: z.union([z.number().int().min(0), z.string().regex(/^\d+$/)]).optional(),
    village: z.string().trim().max(100).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  }),
});

// 3. Cow Schemas
export const createCowSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Farmer ID is required'),
  }),
  body: z.object({
    tagNumber: z.string().trim().max(50).nullable().optional(),
    name: z.string().trim().max(100).nullable().optional(),
    breed: z.string().trim().max(50).default('Gir'),
    gender: z.string().trim().max(20).default('Female'),
    purpose: z.string().trim().max(50).default('Dairy'),
    age: z.union([z.number().int().min(0).max(30), z.string().regex(/^\d*$/)]).nullable().optional(),
    lactationNumber: z.union([z.number().int().min(1).max(20), z.string().regex(/^\d*$/)]).optional(),
    color: z.string().trim().max(50).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  }),
});

export const updateCowSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Farmer ID is required'),
    cowId: z.string().min(1, 'Cow ID is required'),
  }),
  body: z.object({
    tagNumber: z.string().trim().max(50).nullable().optional(),
    name: z.string().trim().max(100).nullable().optional(),
    breed: z.string().trim().max(50).optional(),
    gender: z.string().trim().max(20).optional(),
    purpose: z.string().trim().max(50).optional(),
    age: z.union([z.number().int().min(0).max(30), z.string().regex(/^\d*$/)]).nullable().optional(),
    lactationNumber: z.union([z.number().int().min(1).max(20), z.string().regex(/^\d*$/)]).optional(),
    color: z.string().trim().max(50).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
  }),
});

// 4. Insemination Schemas
export const createInseminationSchema = z.object({
  body: z.object({
    farmerId: z.string().min(1, 'Farmer selection is required').optional(),
    farmer_id: z.string().min(1).optional(),
    farmer: z.any().optional(),
    date: z.string().min(1, 'Insemination date is required').optional(),
    inseminationDate: z.string().min(1).optional(),
    time: z.string().max(10).optional(),
    inseminationTime: z.string().max(10).optional(),
    cowCount: z.union([z.number().int().min(1, 'At least 1 cow required'), z.string().regex(/^\d+$/)]).optional(),
    cowsInseminated: z.union([z.number().int().min(1), z.string().regex(/^\d+$/)]).optional(),
    cowTags: z.string().trim().max(200).nullable().optional(),
    strawCode: z.string().trim().max(100).nullable().optional(),
    notes: z.string().trim().max(1000).nullable().optional(),
    clientId: z.string().trim().max(100).nullable().optional(),
    farmerClientId: z.string().trim().max(100).nullable().optional(),
  }).refine((data) => data.farmerId || data.farmer_id || data.farmer || data.farmerClientId, {
    message: 'Farmer selection is required.',
  }).refine((data) => data.date || data.inseminationDate, {
    message: 'Insemination date is required.',
  }),
});

// 5. Settings Schema
export const updateSettingsSchema = z.object({
  body: z.object({
    clinicName: z.string().trim().min(1).max(150).optional(),
    address: z.string().trim().max(250).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    email: z.string().trim().email('Valid clinic email is required').max(100).nullable().optional().or(z.literal('')),
    website: z.string().trim().max(150).nullable().optional().or(z.literal('')),
    currency: z.string().trim().max(10).optional(),
    theme: z.enum(['light', 'dark']).optional(),
    doctorName: z.string().trim().min(1).max(100).optional(),
    user: z.object({
      name: z.string().trim().min(1).max(100).optional(),
      phone: z.string().trim().max(30).optional(),
      specialization: z.string().trim().max(150).optional(),
    }).optional(),
  }),
});

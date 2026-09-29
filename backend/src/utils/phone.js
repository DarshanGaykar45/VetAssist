/**
 * Safely normalize phone numbers to E.164 standard for WhatsApp delivery
 * - Handles 10-digit Indian numbers (auto prepends +91)
 * - Handles leading 0 (e.g. 09876543210 -> +919876543210)
 * - Handles 12-digit Indian numbers (e.g. 919876543210 -> +919876543210)
 * - Preserves existing international + prefix (e.g. +14155238886, +919270034619)
 */
export function normalizePhoneNumber(phone) {
  if (!phone) return null;
  const raw = String(phone).trim();
  // Strip non-numeric and non-plus characters
  let cleaned = raw.replace(/[^0-9+]/g, '');
  if (!cleaned) return null;

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // Handle leading 0 (11 digits: e.g. 09270034619 -> +919270034619)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    return `+91${cleaned.slice(1)}`;
  }

  // Handle 10-digit national number (e.g. 9270034619 -> +919270034619)
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // Handle 12-digit number starting with 91 (e.g. 919270034619 -> +919270034619)
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

/**
 * Validate whether a phone string can be parsed into a valid phone number
 */
export function isValidPhoneNumber(phone) {
  const normalized = normalizePhoneNumber(phone);
  if (!normalized) return false;
  // E.164 standard: + followed by 8 to 15 digits
  return /^\+[1-9]\d{7,14}$/.test(normalized);
}

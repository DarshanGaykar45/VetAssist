import { normalizePhoneNumber } from '../utils/phone.js';

export { normalizePhoneNumber as formatWhatsAppNumber };

/**
 * Format receipt text for WhatsApp delivery
 */
export function formatReceiptMessage({
  clinicName = 'VetAssist Cattle AI Clinic',
  doctorName = 'Doctor',
  phone = '',
  doctorPhone = '',
  receiptNumber,
  farmerName,
  date,
  time,
  cowCount,
  strawCode,
  notes,
}) {
  const contact = doctorPhone || phone;
  return (
`🐄 *${clinicName.toUpperCase()}*
*Artificial Insemination Receipt*
----------------------------------------
📄 *Receipt No:* ${receiptNumber}
📅 *Date & Time:* ${date} at ${time}
🩺 *Attending Doctor:* ${doctorName}
👨‍🌾 *Farmer Name:* ${farmerName}
🐂 *Cows Inseminated:* ${cowCount}
${strawCode ? `🧬 *Semen / Bull:* ${strawCode}\n` : ''}${notes ? `📝 *Notes:* ${notes}\n` : ''}----------------------------------------
✅ Record saved permanently in clinic database.
${contact ? `📞 Doctor / Clinic Contact: ${contact}\n` : ''}🙏 Thank you for trusting ${clinicName}!`
  );
}

/**
 * Format phone number specifically for wa.me deep links (digits only, country code, no +)
 * e.g. "+91 92700 34619" -> "919270034619"
 * e.g. "9270034619" -> "919270034619"
 * e.g. "09270034619" -> "919270034619"
 */
export function formatPhoneForWaMe(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/[^0-9]/g, '');
  if (!digits) return '';

  // 10 digits Indian national mobile -> prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }

  // 11 digits starting with 0 -> strip 0 and prepend 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `91${digits.slice(1)}`;
  }

  // Already 12 digits starting with 91, or international
  return digits;
}

/**
 * Generate a guaranteed, zero-dependency WhatsApp Web / App deep link (wa.me)
 * This pre-types the recipient number and the full formatted receipt without any third-party APIs.
 */
export function generateWhatsAppDeepLink({ phone, text }) {
  const cleanPhone = formatPhoneForWaMe(phone);
  const encodedText = encodeURIComponent(text || '');
  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedText}`;
  }
  return `https://wa.me/?text=${encodedText}`;
}

/**
 * Build receipt and deep link for an insemination record
 */
export function buildReceiptAndDeepLink({
  farmerMobile,
  farmerName,
  receiptNumber,
  date,
  time,
  cowCount,
  strawCode,
  notes,
  clinicName,
  doctorName,
  clinicPhone,
}) {
  const receiptText = formatReceiptMessage({
    clinicName,
    doctorName,
    phone: clinicPhone,
    receiptNumber,
    farmerName,
    date,
    time,
    cowCount,
    strawCode,
    notes,
  });

  const whatsappLink = generateWhatsAppDeepLink({
    phone: farmerMobile,
    text: receiptText,
  });

  return {
    receiptText,
    whatsappLink,
    farmerMobile: formatPhoneForWaMe(farmerMobile),
  };
}

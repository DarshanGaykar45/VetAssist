/**
 * Utilities for formatting WhatsApp AI Receipts and phone number deep links
 */

export function formatPhoneForWaMe(phone) {
  if (!phone) return "";
  let digits = String(phone).replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return `91${digits.slice(1)}`;
  }
  return digits;
}

export function buildReceiptText(record, clinic, fallbackDoctor) {
  const clinicName = clinic?.clinicName || "VetAssist Cattle AI Clinic";
  const doctor = record?.doctorName || fallbackDoctor || clinic?.doctorName || "Doctor";
  const doctorPhone = clinic?.user?.phone || clinic?.phone || "";
  const receiptNo = record?.receiptNumber || "AI-RECEIPT";
  const date = record?.date || "";
  const time = record?.time || "";
  const farmerName = record?.farmerName || record?.farmer?.name || "Farmer";
  const cowCount = record?.cowCount || 1;
  const strawCode = record?.strawCode;
  const notes = record?.notes;
  const isPending = record?.syncStatus === "pending" || receiptNo.startsWith("TEMP-");

  return (
`🐄 *${clinicName.toUpperCase()}*
*Artificial Insemination Receipt*
----------------------------------------
📄 *Receipt No:* ${receiptNo}${isPending ? " (Local Temp Ref - Final # on sync)" : ""}
📅 *Date & Time:* ${date} at ${time}
🩺 *Attending Doctor:* ${doctor}
👨‍🌾 *Farmer Name:* ${farmerName}
🐂 *Cows Inseminated:* ${cowCount}
${strawCode ? `🧬 *Semen / Bull:* ${strawCode}\n` : ""}${notes ? `📝 *Notes:* ${notes}\n` : ""}----------------------------------------
✅ Record saved ${isPending ? "locally on device (queued for upload)" : "permanently in clinic database"}.
${doctorPhone ? `📞 Doctor / Clinic Contact: ${doctorPhone}\n` : ""}🙏 Thank you for trusting ${clinicName}!`
  );
}

export function getWhatsAppDeepLink(record, clinic, fallbackDoctor) {
  const phone = formatPhoneForWaMe(record?.farmerMobile || record?.farmer?.mobile);
  const text = buildReceiptText(record, clinic, fallbackDoctor);
  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function openWhatsAppReceipt(record, clinic, fallbackDoctor) {
  const link = getWhatsAppDeepLink(record, clinic, fallbackDoctor);
  window.location.href = link;
}

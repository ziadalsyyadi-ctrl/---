/**
 * أداة معالجة وتجهيز أرقام وروابط الواتساب لمديرية قعطبة
 * تحل مشكلة أرقام الهواتف التي تبدأ بصفر (مثل 077...) أو البادئات الدولية (00967 أو +967)
 * وتوفر روابط مباشرة ومجربة لا تعلق في دوائر البحث ولا تظهر خطأ "تعذر الاتصال حاول مرة أخرى".
 */

/**
 * تنظيف وتنسيق رقم الهاتف ليكون رقماً دولياً صالحاً 100% في واتساب
 */
export function formatWhatsAppNumber(phone: string | number | undefined | null): string {
  if (!phone) return '';
  let p = String(phone).trim().replace(/\D/g, ''); // إزالة الرموز والمسافات والشرطات

  if (!p) return '';

  // 1. التعامل مع الصفرين الدوليين 00
  if (p.startsWith('00')) {
    p = p.slice(2);
  }

  // 2. إذا كان الرقم يبدأ بكود اليمن 967، نزيله مؤقتاً لتنظيف الرقم الداخلي
  if (p.startsWith('967')) {
    p = p.slice(3);
  }

  // 3. إزالة أي أصفار في البداية (مثل 077... أو 071... أو 073... أو 078...)
  while (p.startsWith('0')) {
    p = p.slice(1);
  }

  // 4. إذا كان رقماً يمنياً محلياً من 9 أرقام (يبدأ بـ 7)
  if (p.length === 9 && p.startsWith('7')) {
    return `967${p}`;
  }

  // 5. إذا كان الرقم دولياً آخر مكتمل الأرقام (مثل السعودية 966 أو الإمارات 971)
  if (p.length >= 11 && (p.startsWith('966') || p.startsWith('971') || p.startsWith('20') || p.startsWith('967'))) {
    return p;
  }

  // 6. في حال كان الرقم 9 أرقام بشكل عام، نلحق كود اليمن 967
  if (p.length === 9) {
    return `967${p}`;
  }

  // في حال كان الرقم أقل من 9 أرقام لكنه رقم هاتف يمني
  if (p.length > 0 && p.length <= 9) {
    return `967${p}`;
  }

  return p;
}

/**
 * إنشاء الرابط المباشر الصحيح للمحادثة في تطبيق واتساب
 * نستخدم https://api.whatsapp.com/send مباشرة لأنه مدعوم عالمياً من أنظمة أندرويد
 * ويفتح تطبيق واتساب فوراً دون الحاجة لصفحات إعادة توجيه وسيطة قد تفشل أو تعلق
 */
export function getWhatsAppUrl(phone: string | number | undefined | null, message?: string): string {
  const cleanPhone = formatWhatsAppNumber(phone);
  if (!cleanPhone) return '#';

  const encodedText = message ? encodeURIComponent(message.trim()) : '';
  const query = encodedText ? `?phone=${cleanPhone}&text=${encodedText}` : `?phone=${cleanPhone}`;

  return `https://api.whatsapp.com/send${query}`;
}

/**
 * فتح محادثة الواتساب بطريقة موثوقة في بيئة الويب وتطبيق Android Capacitor
 */
export function openWhatsAppChat(phone: string | number | undefined | null, message?: string): void {
  const url = getWhatsAppUrl(phone, message);
  if (url === '#') {
    alert('رقم الهاتف غير متوفر أو غير صالح للواتساب');
    return;
  }

  try {
    // فتح الرابط؛ في حال منع المتصفح للنوافذ المنبثقة، التوجيه المباشر
    const win = window.open(url, '_blank');
    if (!win || win.closed || typeof win.closed === 'undefined') {
      window.location.href = url;
    }
  } catch {
    window.location.href = url;
  }
}

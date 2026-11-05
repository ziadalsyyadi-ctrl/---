/**
 * خدمة الربط بجدول بيانات Google (Google Sheets)
 * معرّف الجدول: 169L0-gWsPmSez8rXivSX5kt5p278Ry6ZJDU66AC42SY
 * اسم ورقة العمل: قائمة الأشخاص
 */

export const GOOGLE_SHEETS_CONFIG = {
  spreadsheetId: '169L0-gWsPmSez8rXivSX5kt5p278Ry6ZJDU66AC42SY',
  sheetName: 'قائمة الأشخاص',
  appsScriptUrl: 'https://script.google.com/macros/s/AKfycbx3HihrveSRxxjWGEl60y4vNcCFcb8IPQH3YlkfvwqaGapESvj11BTvXNwke-O7L56v/exec',
};

export interface RegisterDonorPayload {
  name: string;
  bloodType: string;
  phone: string;
  address: string;
  notes?: string;
  donorId?: string;
}

export interface SheetsSyncResult {
  success: boolean;
  message?: string;
  error?: string;
  statusCode?: number;
  data?: any;
}

/**
 * إرسال بيانات المتبرع إلى جدول Google Sheets عبر خادم التطبيق وواجهة Apps Script
 * لا تعرض نجاحاً إلا عند تأكيد خادم Google حفظ البيانات فعلياً
 */
export async function syncDonorToGoogleSheets(
  payload: RegisterDonorPayload
): Promise<SheetsSyncResult> {
  try {
    const response = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'registerDonor',
        name: payload.name.trim(),
        bloodType: payload.bloodType.trim(),
        phone: payload.phone.trim(),
        address: payload.address.trim(),
        notes: (payload.notes || '').trim(),
        donorId: payload.donorId || '',
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        message: data.message || 'تم تأكيد حفظ المتبرع في جدول Google Sheets بنجاح.',
        statusCode: response.status,
        data: data,
      };
    } else {
      return {
        success: false,
        error: data.error || `خطأ من الخادم (${response.status})`,
        statusCode: response.status,
      };
    }
  } catch (clientErr: any) {
    return {
      success: false,
      error: `تعذر الاتصال بالخادم: ${clientErr.message}`,
      statusCode: 0,
    };
  }
}

/**
 * البحث عن المتبرعين في جدول Google Sheets
 */
export async function searchDonorsFromSheets(
  bloodType: string
): Promise<SheetsSyncResult> {
  try {
    const response = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'searchDonors',
        bloodType,
      }),
    });

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: data.donors || data,
        statusCode: response.status,
      };
    } else {
      return {
        success: false,
        error: data.error || `خطأ أثناء البحث (${response.status})`,
        statusCode: response.status,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: `خطأ في الاتصال: ${err.message}`,
      statusCode: 0,
    };
  }
}

/**
 * تفكيك وتحليل نص أسطر CSV القادمة من جدول بيانات غوغل بدقة
 */
export function parseGoogleSheetsCsv(csvText: string): any[] {
  if (!csvText || typeof csvText !== 'string') return [];
  const parseCsvLine = (line: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const lines = csvText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 1) return [];

  const headerCols = parseCsvLine(lines[0]).map(h => h.trim());
  let nameIdx = headerCols.findIndex(h => (h.includes('اسم') || h.toLowerCase().includes('name')) && !h.toLowerCase().includes('donor'));
  let bloodIdx = headerCols.findIndex(h => h.includes('فصيلة') || h.includes('دم') || h.toLowerCase().includes('blood'));
  let phoneIdx = headerCols.findIndex(h => h.includes('هاتف') || h.includes('رقم') || h.toLowerCase().includes('phone') || h.includes('جوال'));
  let residenceIdx = headerCols.findIndex(h => h.includes('سكن') || h.includes('عنوان') || h.toLowerCase().includes('address') || h.toLowerCase().includes('residence'));
  let dateIdx = headerCols.findIndex(h => h.includes('تاريخ') || h.toLowerCase().includes('date'));
  let idIdx = headerCols.findIndex(h => h.toLowerCase().includes('donorid') || h.toLowerCase().includes('id'));

  if (nameIdx === -1) nameIdx = 1;
  if (bloodIdx === -1) bloodIdx = 2;
  if (phoneIdx === -1) phoneIdx = 3;
  if (residenceIdx === -1) residenceIdx = 4;
  if (idIdx === -1) idIdx = 0;

  const hasHeader = lines[0].includes('اسم') || lines[0].includes('name') || lines[0].includes('donorId');
  const startIndex = hasHeader ? 1 : 0;

  const donors: any[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const sheetId = idIdx >= 0 ? cols[idIdx] : '';
    const name = (cols[nameIdx] || '').trim();
    const blood = (cols[bloodIdx] || 'O+').trim().toUpperCase();
    const phone = (cols[phoneIdx] || '').trim();
    const residence = (cols[residenceIdx] || 'قعطبة').trim();
    const date = dateIdx >= 0 ? (cols[dateIdx] || '').trim() : '';

    if (name && name.length >= 2) {
      donors.push({
        fullName: name,
        bloodType: blood || 'O+',
        phone: phone,
        residence: residence || 'قعطبة',
        notes: date ? `تاريخ التسجيل: ${date}` : 'من سجل الشيت المبارك',
        source: 'google_sheets',
        donorId: sheetId || `row_${i}`
      });
    }
  }

  return donors;
}

/**
 * جلب قائمة المتبرعين من جدول Google Sheets لمزامنتها في التطبيق
 * يدعم العمل في بيئة الويب وتطبيق Android APK مع مسار احتياطي مباشر لـ CSV
 */
export async function fetchDonorsFromGoogleSheets(): Promise<{
  success: boolean;
  donors?: any[];
  count?: number;
  error?: string;
  source?: string;
}> {
  // محاولة 1: عبر واجهة الخادم السريعة
  try {
    const res = await fetch('/api/sheets/donors');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.donors) && data.donors.length > 0) {
        return {
          success: true,
          donors: data.donors,
          count: data.donors.length,
          source: data.source || 'proxy'
        };
      }
    }
  } catch {
    // فشل محلي (مثل تطبيق Android الهجين بدون خادم Express)
  }

  // محاولة 2: الاتصال المباشر برابط تصدير CSV لجدول غوغل (يعمل 100% في Android وiOS والويب)
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEETS_CONFIG.spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(GOOGLE_SHEETS_CONFIG.sheetName)}`;
    const res = await fetch(csvUrl);
    if (res.ok) {
      const text = await res.text();
      if (!text.includes('<!DOCTYPE html>') && text.length > 50) {
        const parsed = parseGoogleSheetsCsv(text);
        if (parsed.length > 0) {
          return {
            success: true,
            donors: parsed,
            count: parsed.length,
            source: 'csv_direct'
          };
        }
      }
    }
  } catch (directErr: any) {
    console.warn('Direct CSV fetch warning:', directErr);
  }

  return {
    success: false,
    error: 'تعذر جلب بيانات الشيت عبر الخادم أو الرابط المباشر',
    donors: []
  };
}

/**
 * إرسال نص صفوف منسوخة من جدول البيانات أو ملف CSV للمزامنة المباشرة
 */
export async function importRawDonors(textData: string): Promise<{
  success: boolean;
  donors?: any[];
  count?: number;
  error?: string;
}> {
  try {
    const res = await fetch('/api/sheets/import-raw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ textData }),
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `فشل استيراد البيانات: ${err.message}`,
    };
  }
}
/**
 * إرسال قائمة كاملة من المتبرعين إلى جدول Google Sheets للمزامنة الشاملة
 * يستخدم هذا الخيار لمزامنة كافة بيانات التطبيق مع الجدول دفعة واحدة
 */
export async function pushAllDonorsToSheets(
  donors: any[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const response = await fetch('/api/sheets/proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'batchRegister',
        donors: donors.map(d => ({
          name: d.fullName || d.name,
          bloodType: d.bloodType,
          phone: d.phone,
          address: d.residence || d.address || 'قعطبة',
          notes: d.notes || '',
          donorId: d.id || d.donorId || ''
        }))
      }),
    });

    const data = await response.json();
    return {
      success: response.ok && data.success,
      count: data.count || 0,
      error: data.error
    };
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: `فشل المزامنة الشاملة: ${err.message}`
    };
  }
}

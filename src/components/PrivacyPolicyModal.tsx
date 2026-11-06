import React from 'react';
import { X, ShieldCheck, Lock, Trash2, Phone, Mail, CheckCircle2, HeartHandshake } from 'lucide-react';
import { getWhatsAppUrl, openWhatsAppChat } from '../utils/whatsapp';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs font-['Cairo',sans-serif] animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-right"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-red-600 to-rose-700 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black">سياسة الخصوصية وأمان البيانات</h2>
              <p className="text-[11px] text-red-100 font-bold">متوافق مع سياسات متجر Google Play</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-white/20 rounded-xl transition-colors text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="bg-red-50 p-3.5 rounded-2xl border border-red-100 space-y-1">
            <span className="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-black inline-block mb-1">
              التزام الخصوصية الإنسانية
            </span>
            <p className="font-bold text-slate-800 text-xs sm:text-sm">
              تطبيق «بنك الدم - قعطبة» مبادرة خيرية وإنسانية تطوعية بالكامل، تهدف لإنقاذ حياة المرضى وربط المحتاجين بالمتبرعين في مديرية قعطبة ومحافظة الضالع.
            </p>
          </div>

          {/* Section 1: Data Collection */}
          <div className="space-y-1.5">
            <h3 className="font-black text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
              <Lock className="w-4 h-4 text-red-600 shrink-0" />
              <span>١. البيانات التي يجمعها التطبيق</span>
            </h3>
            <p className="text-slate-600 text-[11px] sm:text-xs">
              يجمع التطبيق البيانات التي يدخلها المتبرع برغبته واختياره: الاسم، فصيلة الدم، رقم الهاتف، والمنطقة السكنية (قعطبة، مريس، الفاخر، إلخ) فقط لغرض التنسيق للتبرع بالدم عند الحاجة.
            </p>
          </div>

          {/* Section 2: No Selling / Commercial Ads */}
          <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200/80 space-y-1 text-emerald-950">
            <div className="flex items-center gap-1.5 font-black text-xs sm:text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>٢. عدم بيع أو مشاركة البيانات</span>
            </div>
            <p className="text-[11px] sm:text-xs text-emerald-900 leading-normal">
              نضمن عدم بيع أو تأجير أو مشاركة أرقام الهواتف أو بيانات المتبرعين مع أي جهات خارجية أو شركات إعلانية، والتطبيق خالٍ تماماً من الإعلانات التجارية.
            </p>
          </div>

          {/* Section 3: Data Deletion */}
          <div className="space-y-1.5">
            <h3 className="font-black text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
              <Trash2 className="w-4 h-4 text-red-600 shrink-0" />
              <span>٣. حق تعديل وحذف البيانات (Data Deletion)</span>
            </h3>
            <p className="text-slate-600 text-[11px] sm:text-xs leading-normal">
              يحق لكل متبرع في أي وقت:
              <br />• تغيير حالته إلى (غير متاح للتبرع حالياً).
              <br />• حذف اسمه ورقم هاتفه نهائياً من السجل مباشرة عبر زر الحذف في الملف الشخصي.
              <br />• طلب حذف بياناته عبر مراسلة الإدارة على البريد: <code>ziadalsyyadi@gmail.com</code> أو عبر واتساب.
            </p>
          </div>

          {/* Section 4: Security */}
          <div className="space-y-1.5">
            <h3 className="font-black text-slate-900 flex items-center gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="w-4 h-4 text-red-600 shrink-0" />
              <span>٤. أمان وتشفير النقل والتخزين المحلي</span>
            </h3>
            <p className="text-slate-600 text-[11px] sm:text-xs">
              يتم نقل البيانات عبر اتصالات مشفرة بالكامل (HTTPS / SSL)، وتُحفظ البيانات محلياً على جهاز المستخدم لدعم العمل في وضع عدم الاتصال (Offline) بأمان تام.
            </p>
          </div>

          {/* Contact Box */}
          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
            <span className="text-xs font-black text-slate-800 block">للتواصل مع المسؤولين وإدارة الخصوصية:</span>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600 font-bold">البريد: ziadalsyyadi@gmail.com</span>
              <button
                type="button"
                onClick={() => openWhatsAppChat('773633918', 'السلام عليكم، استفسار بخصوص سياسة الخصوصية وأمان البيانات')}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1 transition-all"
              >
                <Phone className="w-3 h-3" />
                <span>واتساب الإدارة</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-red-600 hover:underline font-bold"
          >
            فتح صفحة الويب الكاملة للسياسة ↗
          </a>
          <button 
            onClick={onClose}
            className="py-2 px-5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

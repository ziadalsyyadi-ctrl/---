import React from 'react';
import { ShieldAlert, UserPlus, LogIn } from 'lucide-react';

interface VisitorRestrictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegister: () => void;
  onOpenLogin: () => void;
}

export const VisitorRestrictionModal: React.FC<VisitorRestrictionModalProps> = ({
  isOpen,
  onClose,
  onOpenRegister,
  onOpenLogin,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 font-['Cairo',sans-serif] text-right">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto shadow-inner border border-red-100">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-base font-black text-slate-900">تنبيه الصلاحيات</h3>
          <p className="text-xs sm:text-sm font-extrabold text-slate-800 leading-relaxed bg-red-50/80 p-3.5 rounded-2xl border border-red-100">
            «هذه الخدمة تتطلب إنشاء حساب أو تسجيل الدخول»
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRegister();
            }}
            className="py-3 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-md shadow-red-200 transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>إنشاء حساب</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLogin();
            }}
            className="py-3 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>تسجيل الدخول</span>
          </button>
        </div>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-bold"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

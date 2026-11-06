import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HeroBanner } from './components/HeroBanner';
import { DonorRegistration } from './components/DonorRegistration';
import { DonorSearch } from './components/DonorSearch';
import { UrgentRequests, isUrgentRequestExpired } from './components/UrgentRequests';
import { UserProfileView } from './components/UserProfileView';
import { AuthModal } from './components/AuthModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { BloodCompatibilityModal } from './components/BloodCompatibilityModal';
import { AdminDashboard } from './components/AdminDashboard';
import { BloodDonationEducationalInfo } from './components/BloodDonationEducationalInfo';
import { ConfirmExitModal } from './components/ConfirmExitModal';
import { RoleSelectionModal } from './components/RoleSelectionModal';
import { NotificationsModal } from './components/NotificationsModal';
import { QaetabahHospitalsDirectory } from './components/QaetabahHospitalsDirectory';
import { Sidebar } from './components/Sidebar';
import ChatSupport from './components/ChatSupport';
import { VisitorRestrictionModal } from './components/VisitorRestrictionModal';
// Removed DonorStats import
import { ActiveTab, Donor, UrgentRequest, BloodType } from './types';
import { onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { 
  subscribeToDonors, 
  subscribeToUrgentRequests, 
  seedInitialCommunityData,
  deleteDonorProfile
} from './services/donorService';
import { fetchDonorsFromGoogleSheets } from './services/googleSheetsService';
import { INITIAL_SEED_DONORS } from './data/initialData';
import {
  getInstantLocalDonorsSync,
  getInstantLocalUrgentSync,
  getDonorsFromOfflineStorage,
  getUrgentRequestsFromOfflineStorage,
  saveDonorsToOfflineStorage,
  saveUrgentRequestsToOfflineStorage,
  deleteDonorFromOfflineStorage,
  getInstantSyncMetaSync,
} from './services/offlineStorageService';
import { Droplet, Heart, ShieldAlert, Sparkles, Smartphone, WifiOff, RefreshCw, CheckCircle2, Megaphone, X, Hospital, ShieldCheck, Database, HardDriveDownload } from 'lucide-react';

function AppContent() {
  const { currentUser, userProfile, activeRole, switchActiveRole, isLoading: authLoading, logout, isGuest } = useAuth();

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchFilter, setSearchFilter] = useState<BloodType | 'ALL'>('ALL');
  // 0ms instant hydration: Load from permanent offline storage immediately on first tick
  const [donors, setDonors] = useState<Donor[]>(() => getInstantLocalDonorsSync());
  const [deletedDonors, setDeletedDonors] = useState<string[]>([]);
  const [urgentRequests, setUrgentRequests] = useState<UrgentRequest[]>(() => getInstantLocalUrgentSync());
  const [announcement, setAnnouncement] = useState<string>('');
  const [announcementType, setAnnouncementType] = useState<'general' | 'urgent' | 'campaign'>('general');
  const [announcementTime, setAnnouncementTime] = useState<string>('');
  const [adminAnnouncementInput, setAdminAnnouncementInput] = useState<string>('');
  const [adminAnnouncementType, setAdminAnnouncementType] = useState<'general' | 'urgent' | 'campaign'>('general');
  const [savingAnnouncement, setSavingAnnouncement] = useState<boolean>(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState<string | null>(null);

  // Sync state & diagnostics between Firebase and Google Sheets
  const [syncStats, setSyncStats] = useState<{
    firestoreCount: number;
    sheetsCount: number;
    duplicateCount: number;
    excludedCount: number;
    finalCount: number;
    lastSyncTime: string;
  }>(() => {
    const cachedMeta = getInstantSyncMetaSync();
    return {
      firestoreCount: cachedMeta?.firestoreCount || 0,
      sheetsCount: cachedMeta?.sheetsCount || 0,
      duplicateCount: 0,
      excludedCount: 0,
      finalCount: cachedMeta?.donorCount || getInstantLocalDonorsSync().length,
      lastSyncTime: cachedMeta?.lastSyncTime || 'محفوظ محلياً',
    };
  });

  const firestoreDonorsRef = useRef<Donor[]>([]);
  const sheetsDonorsRef = useRef<Donor[]>([]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setRefreshToast('تمت استعادة الاتصال بالإنترنت! جاري تحديث ومزامنة البيانات مع السحابة...');
      handleGlobalRefresh();
    };
    const handleOffline = () => {
      setIsOffline(true);
      setRefreshToast('انقطع الاتصال بالإنترنت. تم تفعيل وضع التخزين المحلي (Offline) وجميع المتبرعين متاحون فوراً!');
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        handleGlobalRefresh();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isCompatOpen, setIsCompatOpen] = useState(false);
  const [isExitConfirmOpen, setIsExitConfirmOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isHospitalsOpen, setIsHospitalsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [editingDonorId, setEditingDonorId] = useState<string | null>(null);
  const [showVisitorRestriction, setShowVisitorRestriction] = useState(false);

  const handleEditDonor = (donorId?: string) => {
    setEditingDonorId(donorId || null);
    setActiveTab('register');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteDonor = async (donorId: string, phone?: string) => {
    try {
      await deleteDonorProfile(donorId, phone);
      await deleteDonorFromOfflineStorage(donorId, phone).catch(() => {});
      const cleanP = phone ? phone.trim().replace(/\D/g, '') : '';
      const toHide = [donorId];
      if (cleanP) toHide.push(cleanP);

      setDeletedDonors(prev => [...prev, ...toHide]);
      setDonors(prev => prev.filter(d => {
        if (d.id === donorId) return false;
        if (cleanP && String(d.phone).replace(/\D/g, '') === cleanP) return false;
        return true;
      }));
    } catch (err: any) {
      console.error('Failed to delete donor:', err);
      throw err;
    }
  };

  // Handle searching with a specific filter from other tabs
  const handleSearchWithFilter = (bloodType: BloodType | 'ALL' | ActiveTab) => {
    if (bloodType === 'register' && !currentUser) {
      setShowVisitorRestriction(true);
      return;
    }
    if (bloodType === 'home' || bloodType === 'search' || bloodType === 'urgent' || bloodType === 'register' || bloodType === 'admin') {
      if (bloodType === 'search') setSearchFilter('ALL');
      setActiveTab(bloodType as ActiveTab);
      if (bloodType !== 'register') setEditingDonorId(null);
    } else {
      setSearchFilter(bloodType as BloodType | 'ALL');
      setActiveTab('search');
      setEditingDonorId(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync admin announcement input when announcement changes
  useEffect(() => {
    if (announcement) {
      setAdminAnnouncementInput(announcement);
    }
  }, [announcement]);

  const handleSaveAnnouncement = async () => {
    if (!currentUser) return;
    setSavingAnnouncement(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        announcement: adminAnnouncementInput.trim(),
        noticeMessage: adminAnnouncementInput.trim(),
        announcementType: adminAnnouncementType,
        announcementTime: new Date().toISOString(),
        announcementActive: Boolean(adminAnnouncementInput.trim()),
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      }, { merge: true });
      setRefreshToast('تم نشر وتحديث التعميم بنجاح لتظهر فوراً لدى جميع المستخدمين! ✓');
      setTimeout(() => setRefreshToast(null), 4000);
    } catch (err: any) {
      console.error('Error saving announcement:', err);
      setRefreshToast(`فشل حفظ التعميم: ${err.message}`);
      setTimeout(() => setRefreshToast(null), 4000);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const handleClearAnnouncement = async () => {
    if (!currentUser) return;
    setSavingAnnouncement(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        announcement: '',
        noticeMessage: '',
        announcementActive: false,
        updatedAt: serverTimestamp(),
        updatedBy: currentUser.uid,
      }, { merge: true });
      setAdminAnnouncementInput('');
      setRefreshToast('تم مسح التعميم بنجاح! ✓');
      setTimeout(() => setRefreshToast(null), 3000);
    } catch (err: any) {
      console.error('Error clearing announcement:', err);
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Handle manual exit via UI with logout confirmation
  const handleExit = async () => {
    try {
      await logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    localStorage.removeItem('blood_app_guest');
    localStorage.setItem('has_logged_out', 'true');
    setIsExitConfirmOpen(false);
    setActiveTab('home');
    setIsAuthOpen(true);
  };

  // Helper to normalize phone numbers (e.g., Yemen 967 standard format)
  const normalizePhone = (phone: any): string => {
    if (!phone) return '';
    let p = String(phone).replace(/\D/g, '');
    if (p.startsWith('00967')) p = p.slice(5);
    else if (p.startsWith('967')) p = p.slice(3);
    else if (p.startsWith('0') && p.length === 10) p = p.slice(1);
    if (p === '0' || p.length < 7) return '';
    return p;
  };

  // Computed active donors list that automatically filters out deleted items safely
  const activeDonors = useMemo(() => {
    if (!deletedDonors || deletedDonors.length === 0) return donors;
    const delSet = new Set(deletedDonors.map(s => String(s).trim()).filter(Boolean));
    if (delSet.size === 0) return donors;

    return donors.filter(d => {
      // Check ID
      if (delSet.has(d.id)) return false;
      // Check normalized phone only if present and valid
      const cleanP = normalizePhone(d.phone);
      if (cleanP && delSet.has(cleanP)) return false;
      return true;
    });
  }, [donors, deletedDonors]);

  // Authoritative merge function for Firestore and Google Sheets donors
  const mergeAndSetDonors = (fsList: Donor[], shList: Donor[]) => {
    if (fsList.length === 0 && shList.length === 0) return;

    const seenValidPhones = new Set<string>();
    const merged: Donor[] = [];
    let duplicateCount = 0;
    let excludedCount = 0;

    // 1. Add all Firestore donors (authoritative source for realtime user updates)
    for (const fd of fsList) {
      const norm = normalizePhone(fd.phone);
      if (norm) {
        seenValidPhones.add(norm);
      }
      merged.push({
        ...fd,
        source: fd.source || 'firestore',
      });
    }

    // 2. Add Google Sheets donors, deduplicating valid phones
    const seenNoPhoneNames = new Set<string>();

    for (const sd of shList) {
      const norm = normalizePhone(sd.phone);
      if (norm) {
        if (seenValidPhones.has(norm)) {
          duplicateCount++;
        } else {
          seenValidPhones.add(norm);
          merged.push({
            ...sd,
            source: 'google_sheets',
          });
        }
      } else {
        // Record without a valid phone: Keep it safely as requested
        merged.push({
          ...sd,
          source: 'google_sheets',
        });
      }
    }

    const stats = {
      firestoreCount: fsList.length,
      sheetsCount: shList.length,
      duplicateCount,
      excludedCount,
      finalCount: merged.length,
      lastSyncTime: new Date().toLocaleTimeString('ar-YE'),
    };

    console.log('📊 [Donor Sync Diagnostic]:', stats);
    setSyncStats(stats);

    setDonors(prev => {
      // Safety rule #6: Never replace a complete donor list with a partial result
      if (prev.length > merged.length && merged.length < 10) {
        console.warn('Prevented replacing full donor list with partial result');
        return prev;
      }
      return merged;
    });

    // Save to permanent local database (IndexedDB) and synchronous cache mirror
    saveDonorsToOfflineStorage(merged, {
      sheetsCount: shList.length,
      firestoreCount: fsList.length,
    }).catch(err => console.warn('Offline storage save warning:', err));
  };

  // Helper to fetch from Google Sheets with full multi-tier fallback (server + direct CSV)
  const fetchSheetsDonorsHelper = async (): Promise<Donor[]> => {
    try {
      const result = await fetchDonorsFromGoogleSheets();
      if (result.success && Array.isArray(result.donors) && result.donors.length > 0) {
        const mapped: Donor[] = result.donors.map((d: any, idx: number) => ({
          id: d.donorId ? `sheet_${d.donorId}` : `sheet_row_${idx + 1}`,
          userId: '',
          fullName: d.fullName || d.name || 'متبرع بدون اسم',
          bloodType: (d.bloodType || 'O+').toUpperCase() as BloodType,
          phone: d.phone || '',
          phoneVerified: false,
          residence: d.residence || d.address || 'قعطبة',
          notes: d.notes || 'من سجل جدول غوغل',
          isAvailable: true,
          allowContact: true,
          source: 'google_sheets',
        }));
        sheetsDonorsRef.current = mapped;
        return mapped;
      }
    } catch (err) {
      console.warn('Sheets fetch caught error:', err);
    }
    return sheetsDonorsRef.current;
  };

  // Subscription and initial dual-source data loading
  useEffect(() => {
    let isMounted = true;

    // 0. Asynchronous hydration from IndexedDB for maximum consistency
    getDonorsFromOfflineStorage().then((localList) => {
      if (isMounted && localList.length > 0) {
        setDonors((prev) => (localList.length >= prev.length ? localList : prev));
      }
    });

    getUrgentRequestsFromOfflineStorage().then((localUrgent) => {
      if (isMounted && localUrgent.length > 0) {
        setUrgentRequests((prev) => (localUrgent.length >= prev.length ? localUrgent : prev));
      }
    });

    // 1. Initial background fetch from Google Sheets
    fetchSheetsDonorsHelper().then((sheetsList) => {
      if (isMounted && sheetsList.length > 0) {
        mergeAndSetDonors(firestoreDonorsRef.current, sheetsList);
      }
    });

    // 2. Realtime subscription to Firestore donors
    const unsubDonors = subscribeToDonors((data) => {
      firestoreDonorsRef.current = data;
      if (isMounted) {
        mergeAndSetDonors(data, sheetsDonorsRef.current);
      }
    });

    // 3. Realtime subscription to urgent blood requests
    const unsubRequests = subscribeToUrgentRequests((data) => {
      if (isMounted) {
        setUrgentRequests(data);
        saveUrgentRequestsToOfflineStorage(data).catch(() => {});
      }
    });

    // 4. Realtime subscription to global settings & announcements
    const unsubSettings = onSnapshot(doc(db, 'settings', 'global'), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data();
        const msg = data.announcement || data.noticeMessage || '';
        setAnnouncement(msg);
        if (data.announcementType) setAnnouncementType(data.announcementType);
        if (data.announcementTime) setAnnouncementTime(data.announcementTime);
        if (Array.isArray(data.deletedDonors)) setDeletedDonors(data.deletedDonors);
      }
    });

    // 5. Periodic background re-sync every 5 minutes
    const interval = setInterval(() => {
      fetchSheetsDonorsHelper().then((sheetsList) => {
        if (isMounted && sheetsList.length > 0) {
          mergeAndSetDonors(firestoreDonorsRef.current, sheetsList);
        }
      });
    }, 5 * 60 * 1000);

    return () => {
      isMounted = false;
      unsubDonors();
      unsubRequests();
      unsubSettings();
      clearInterval(interval);
    };
  }, []);

  // Comprehensive manual/automated refresh function
  const handleGlobalRefresh = async () => {
    try {
      setIsRefreshing(true);
      setRefreshToast(null);

      if ('serviceWorker' in navigator) {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const r of regs) await r.update();
        } catch (e) {}
      }

      // Fetch fresh Google Sheets donors
      const freshSheets = await fetchSheetsDonorsHelper();

      // Merge with latest Firestore donors
      mergeAndSetDonors(firestoreDonorsRef.current, freshSheets);

      const totalCount = activeDonors.length;
      setRefreshToast(`تم التحديث الشامل بنجاح! الإجمالي المتوفر: ${totalCount} متبرع.`);
      setTimeout(() => setRefreshToast(null), 3500);
    } catch (err: any) {
      setRefreshToast('تم فحص الاتصال ومزامنة البيانات.');
      setTimeout(() => setRefreshToast(null), 2500);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Seed initial community data if empty
  useEffect(() => {
    if (donors.length === 0 && currentUser) {
      seedInitialCommunityData(currentUser.uid);
    }
  }, [donors.length, currentUser]);

  // Initialize push notifications
  useEffect(() => {
    if (currentUser) {
      import('./services/notificationService').then(({ initializePushNotifications }) => {
        initializePushNotifications(currentUser.uid);
      });
    }
  }, [currentUser]);

  // Filter urgent requests: automatically hide those older than 48 hours
  const validUrgentRequests = urgentRequests.filter((r) => !isUrgentRequestExpired(r));
  const activeUrgentCount = validUrgentRequests.filter((r) => r.status === 'open').length;
  const totalUnreadNotifications = activeUrgentCount + (announcement ? 1 : 0);

  // Check whether user must authenticate or continue as guest on initial startup
  const hasLoggedOut = typeof window !== 'undefined' && localStorage.getItem('has_logged_out') === 'true';
  const isInitialAuthRequired = !currentUser && (!isGuest || hasLoggedOut);

  // 1. Branded Loading Splash Screen while checking session (ZERO FLICKER of home screen)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-red-950 to-slate-950 flex flex-col items-center justify-center p-6 text-white text-center font-['Cairo',sans-serif]">
        <div className="relative mb-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-linear-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-2xl shadow-red-600/50 animate-pulse">
            <Droplet className="w-10 h-10 sm:w-12 sm:h-12 fill-white text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-red-600 rounded-full flex items-center justify-center shadow-md">
            <Heart className="w-4 h-4 fill-red-600 text-red-600" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
          قطرة دم تنقذ حياة
        </h1>
        <p className="text-xs sm:text-sm text-red-200/90 font-bold max-w-xs mb-8">
          بنك الدم المجتمعي • مديرية قعطبة
        </p>

        <div className="flex items-center gap-3 px-4 py-2.5 rounded-full bg-white/10 backdrop-blur-md text-red-100 text-xs font-bold border border-white/10">
          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>جاري تهيئة التطبيق وفحص البيانات...</span>
        </div>
      </div>
    );
  }

  // 2. Direct Auth Screen on startup if unauthenticated (ZERO FLICKER of home screen)
  if (isInitialAuthRequired) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-950 via-red-950 to-slate-950 font-['Cairo',sans-serif]">
        <AuthModal
          isOpen={true}
          isInitialScreen={true}
          onClose={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 font-['Cairo',sans-serif]">
      
      {/* Top App Header with comprehensive refresh button */}
      <Header
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenInstallModal={() => setIsInstallOpen(true)}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onGoToUrgent={() => setActiveTab('urgent')}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenRoleModal={() => setIsRoleModalOpen(true)}
        onGlobalRefresh={handleGlobalRefresh}
        isRefreshing={isRefreshing}
        unreadCount={totalUnreadNotifications}
      />

      <Sidebar 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        donors={activeDonors}
        onOpenExitConfirm={() => setIsExitConfirmOpen(true)}
        onOpenChat={() => setActiveTab('chat')}
      />

      {/* Floating Refresh Toast Feedback */}
      {refreshToast && (
        <div className="fixed top-16 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-emerald-700 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/50 animate-in slide-in-from-top-3 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-200 shrink-0" />
          <p className="text-xs sm:text-sm font-bold flex-1 leading-snug">{refreshToast}</p>
          <button 
            onClick={() => setRefreshToast(null)} 
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-emerald-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 pb-28 sm:pb-16 min-h-[calc(100vh-4rem)]">
        {isOffline && (
          <div className="mb-4 p-3.5 rounded-2xl bg-linear-to-r from-amber-600 to-amber-700 text-white shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-amber-400/40 dir-rtl">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <HardDriveDownload className="w-5 h-5 text-amber-100 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-white text-amber-900 px-2 py-0.5 rounded-full font-black">
                    وضع عدم الاتصال (Offline)
                  </span>
                  <span className="text-xs sm:text-sm font-bold">
                    البيانات محفوظة بالكامل على جهازك ({activeDonors.length} متبرع)
                  </span>
                </div>
                <p className="text-[11px] text-amber-100">
                  يمكنك البحث والاتصال بجميع المتبرعين فوراً بدون انتظار الإنترنت. ستتم المزامنة تلقائياً عند الاتصال.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (navigator.onLine) {
                  setIsOffline(false);
                }
                handleGlobalRefresh();
              }}
              className="px-3.5 py-1.5 bg-white text-amber-800 hover:bg-amber-50 font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 shrink-0 active:scale-95 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              فحص الاتصال والتحديث
            </button>
          </div>
        )}

        {/* Main Content (Always visible to ensure direct opening) */}
        <>
          {/* Admin Broadcast Announcement Banner (Visible to all users) */}
          {announcement && (
            <div 
              onClick={() => setIsNotificationsOpen(true)}
              className={`mb-4 p-3 rounded-2xl text-white shadow-lg flex items-center justify-between gap-3 overflow-hidden relative group cursor-pointer transition-all active:scale-99 ${
                announcementType === 'urgent'
                  ? 'bg-linear-to-r from-red-700 via-rose-700 to-red-800 border-2 border-red-400'
                  : announcementType === 'campaign'
                  ? 'bg-linear-to-r from-emerald-700 via-teal-700 to-emerald-800 border-2 border-emerald-400'
                  : 'bg-linear-to-r from-amber-600 via-orange-600 to-amber-700 border-2 border-amber-300'
              }`}
            >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Megaphone className="w-4.5 h-4.5 fill-white animate-pulse" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-white/25 px-2 py-0.5 rounded-full font-black">
                        {announcementType === 'urgent' ? 'نداء استغاثة عاجل' : announcementType === 'campaign' ? 'حملة تبرع' : 'تنويه الإدارة'}
                      </span>
                      <span className="text-xs font-black truncate">
                        {announcement}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] bg-white text-slate-900 px-2 py-1 rounded-lg font-bold shrink-0">
                  عرض التفاصيل
                </span>
              </div>
            )}

            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* In-page Admin Announcement & Controls on Home */}
                {activeRole === 'admin' && (
                  <div className="bg-linear-to-r from-amber-600 via-amber-700 to-rose-700 text-white rounded-2xl p-4 shadow-md space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-amber-200 shrink-0" />
                        <div>
                          <h3 className="text-sm font-black">أدوات الإدارة والتعميم (وضع المسؤول)</h3>
                          <p className="text-[11px] text-amber-100">تحكم بالرسائل العامة والإشعارات وتحديث النظام</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleGlobalRefresh}
                          disabled={isRefreshing}
                          className="px-3 py-1.5 rounded-xl bg-white text-amber-950 hover:bg-amber-50 text-xs font-black flex items-center gap-1.5 shadow-xs transition-colors active:scale-95 disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                          <span>تحديث شامل</span>
                        </button>
                      </div>
                    </div>

                    {/* Announcement Editor */}
                    <div className="bg-amber-950/40 p-3 rounded-xl border border-amber-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-100">التعميم الحالي المنشور:</span>
                        <div className="flex items-center gap-1 text-[11px]">
                          <button
                            type="button"
                            onClick={() => setAdminAnnouncementType('general')}
                            className={`px-2 py-0.5 rounded-lg font-bold ${adminAnnouncementType === 'general' ? 'bg-amber-500 text-white' : 'text-amber-200 hover:bg-amber-800'}`}
                          >
                            عام
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminAnnouncementType('urgent')}
                            className={`px-2 py-0.5 rounded-lg font-bold ${adminAnnouncementType === 'urgent' ? 'bg-rose-600 text-white' : 'text-amber-200 hover:bg-amber-800'}`}
                          >
                            عاجل
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdminAnnouncementType('campaign')}
                            className={`px-2 py-0.5 rounded-lg font-bold ${adminAnnouncementType === 'campaign' ? 'bg-emerald-600 text-white' : 'text-amber-200 hover:bg-amber-800'}`}
                          >
                            حملة
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={adminAnnouncementInput}
                          onChange={(e) => setAdminAnnouncementInput(e.target.value)}
                          placeholder="اكتب رسالة أو تعميم ليظهر كشريط إشعارات عند جميع المستخدمين..."
                          className="flex-1 px-3 py-2 rounded-xl bg-white text-slate-800 text-xs font-bold outline-hidden shadow-inner"
                        />
                        <button
                          type="button"
                          onClick={handleSaveAnnouncement}
                          disabled={savingAnnouncement}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-amber-950 font-black text-xs transition-colors shrink-0 disabled:opacity-50"
                        >
                          {savingAnnouncement ? 'جارٍ النشر...' : 'نشر'}
                        </button>
                        {announcement && (
                          <button
                            type="button"
                            onClick={handleClearAnnouncement}
                            className="px-2.5 py-2 rounded-xl bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-bold shrink-0"
                            title="مسح التعميم"
                          >
                            مسح
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <HeroBanner
                  onNavigate={handleSearchWithFilter}
                  donors={activeDonors}
                  urgentRequests={validUrgentRequests}
                  onOpenCompatibility={() => setIsCompatOpen(true)}
                />
              </div>
            )}

            {activeTab === 'search' && (
              <DonorSearch
                donors={activeDonors}
                onNavigateToRegister={() => {
                  if (!currentUser) {
                    setShowVisitorRestriction(true);
                  } else {
                    setActiveTab('register');
                  }
                }}
                initialBloodType={searchFilter}
                onEditDonor={handleEditDonor}
                onDeleteDonor={handleDeleteDonor}
                syncStats={syncStats}
                isOffline={isOffline}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'urgent' && (
              <UrgentRequests
                urgentRequests={urgentRequests}
                onOpenAuth={() => setIsAuthOpen(true)}
              />
            )}

            {activeTab === 'register' && (
              <DonorRegistration
                onSuccessNavigate={() => {
                  setActiveTab('search');
                  setEditingDonorId(null);
                }}
                donors={activeDonors}
                onOpenAuth={() => setIsAuthOpen(true)}
                editingDonorId={editingDonorId}
                onDeleteDonor={handleDeleteDonor}
              />
            )}

            {activeTab === 'info' && (
              <BloodDonationEducationalInfo />
            )}

            {activeTab === 'hospitals' && (
              <div className="w-full max-w-4xl mx-auto space-y-4">
                <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/90 text-center">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-inner">
                    <Hospital className="w-7 h-7 sm:w-8 sm:h-8" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">دليل المستشفيات والنقاط الطبية</h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-bold mt-1">مديرية قعطبة - الضالع</p>
                </div>
                <QaetabahHospitalsDirectory isOpen={true} isEmbedded={true} onClose={() => setActiveTab('home')} />
              </div>
            )}

            {activeTab === 'admin' && (
              <AdminDashboard 
                onBack={() => setActiveTab('home')} 
                donors={activeDonors}
                onEditDonor={handleEditDonor}
                onDeleteDonor={handleDeleteDonor}
                onGlobalRefresh={handleGlobalRefresh}
                isRefreshing={isRefreshing}
              />
            )}

            {activeTab === 'chat' && (
              <ChatSupport 
                userProfile={userProfile}
                onBack={() => setActiveTab('home')}
              />
            )}
          </>
      </main>

      {/* Bottom Android Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          if (tab === 'register' && !currentUser) {
            setShowVisitorRestriction(true);
            return;
          }
          if (tab === 'search') setSearchFilter('ALL');
          setActiveTab(tab);
          if (tab === 'register') {
            setEditingDonorId(null);
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        urgentCount={activeUrgentCount}
      />

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
      />

      <VisitorRestrictionModal
        isOpen={showVisitorRestriction}
        onClose={() => setShowVisitorRestriction(false)}
        onOpenRegister={() => {
          setShowVisitorRestriction(false);
          setIsAuthOpen(true);
        }}
        onOpenLogin={() => {
          setShowVisitorRestriction(false);
          setIsAuthOpen(true);
        }}
      />

      <AndroidInstallModal
        isOpen={isInstallOpen}
        onClose={() => setIsInstallOpen(false)}
      />

      <BloodCompatibilityModal
        isOpen={isCompatOpen}
        onClose={() => setIsCompatOpen(false)}
      />

      <ConfirmExitModal
        isOpen={isExitConfirmOpen}
        onClose={() => setIsExitConfirmOpen(false)}
        onConfirm={handleExit}
      />

      <RoleSelectionModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
        currentRole={activeRole}
        onRoleChange={(role) => {
          switchActiveRole(role);
          if (role === 'admin') {
            setActiveTab('admin');
          } else {
            setActiveTab('home');
          }
        }}
        onOpenAdminAuth={() => setIsAuthOpen(true)}
      />

      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        urgentRequests={validUrgentRequests}
        announcement={announcement}
        announcementType={announcementType}
        announcementTime={announcementTime}
        onGoToUrgent={() => {
          setActiveTab('urgent');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <QaetabahHospitalsDirectory
        isOpen={isHospitalsOpen}
        onClose={() => setIsHospitalsOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

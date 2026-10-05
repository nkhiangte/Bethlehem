import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Clock, 
  User, 
  Plus, 
  X, 
  Pencil, 
  Trash2, 
  Calendar, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  BookOpen, 
  Layers, 
  Info, 
  Bell, 
  ExternalLink 
} from 'lucide-react';
import { db, isFirebaseConfigured } from '../lib/firebase';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { 
  InkhawmProgramme, 
  PROGRAM_TITLES, 
  DEFAULT_PROGRAM_ROLES, 
  TawngtaiHruaituMonth, 
  TawngtaiHruaituDay,
  WeeklySchedulePackage,
  WeeklyServiceItem,
  STANDARD_WEEKLY_SERVICES_TEMPLATE
} from '../types';
import { useAuth } from '../lib/auth';
import { ShareButton } from '../components/ShareButton';
import { updateDocumentMetadata } from '../lib/seo';

// --- DATE HELPER UTILITIES ---

function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split('T')[0];
}

function formatMizoDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const mizoDays = ['Pathianni', 'Thawhtanni', 'Thawhlehni', 'Nilaini', 'Ningani', 'Zirtawpni', 'Inrinni'];
  const dayName = mizoDays[dt.getUTCDay()];
  const month = dt.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  return `${d} ${month}, ${y} (${dayName})`;
}

export { formatTimeDisplay, to24HourTime } from '../lib/utils';
import { 
  formatTimeDisplay, 
  to24HourTime, 
  buildWeeklyPackages, 
  getWeekRangeForDate, 
  formatDateRange,
  getCurrentChurchWeekRange,
  createBlankWeeklyPackageTemplate
} from '../lib/utils';

function getNextOrCurrentWednesday(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const current = new Date(year, month, day);
  const dayOfWeek = current.getDay(); // 0 is Sun, 3 is Wed
  let diff = 3 - dayOfWeek;
  if (dayOfWeek === 0) {
    // Sunday: upcoming Wednesday (+3 days)
    diff = 3;
  } else if (dayOfWeek > 3) {
    // Thu(4), Fri(5), Sat(6): Wednesday of this week (diff < 0)
    diff = 3 - dayOfWeek;
  }
  const wed = new Date(year, month, day + diff);
  return `${wed.getFullYear()}-${String(wed.getMonth() + 1).padStart(2, '0')}-${String(wed.getDate()).padStart(2, '0')}`;
}

function generateWeeklyShareData(pkg: WeeklySchedulePackage) {
  const range = formatDateRange(pkg.startDate, pkg.endDate);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareUrl = `${origin}/programs?week=${pkg.id}`;

  const lines: string[] = [];
  lines.push(`*BETHLEHEM KOHHRAN - TUN KAR KOHHRAN INKHAWM PROGRAMME*`);
  lines.push(`🗓️ ${range} (Nilaini Zan – Pathianni Zan)`);
  lines.push(``);

  pkg.services.forEach((srv) => {
    const [y, m, d] = (srv.date || '').split('-').map(Number);
    const dateLabel = !isNaN(d) 
      ? `${d} ${new Date(Date.UTC(y, m - 1, d)).toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })}` 
      : srv.date;
    const timeLabel = formatTimeDisplay(srv.time);
    
    lines.push(`🔹 *${srv.dayTitle || srv.dayShort}* (${dateLabel}${timeLabel ? `, ${timeLabel}` : ''})`);
    srv.roles.forEach((r) => {
      if (r.value?.trim()) {
        lines.push(`• ${r.role}: ${r.value.trim()}`);
      }
    });
    if (srv.notes?.trim()) {
      lines.push(`• Note: ${srv.notes.trim()}`);
    }
    lines.push(``);
  });

  if (pkg.announcements?.trim()) {
    lines.push(`📢 *Hriattirna / Announcements:*`);
    lines.push(pkg.announcements.trim());
    lines.push(``);
  }

  const snippet = lines.join('\n').trim();
  const fullText = `${snippet}\n\nRead more & view full schedule:\n${shareUrl}`;
  return { fullText, snippet, range, shareUrl };
}

export default function Programs() {
  const { isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const weekParam = searchParams.get('week');

  const [activeTab, setActiveTab] = useState<'weekly' | 'inkhawm' | 'tawngtai'>('weekly');
  const [loading, setLoading] = useState(true);

  // --- WEEKLY SCHEDULE PACKAGE STATES ---
  const [weeklyPackages, setWeeklyPackages] = useState<WeeklySchedulePackage[]>([]);
  const [currentWeekPackage, setCurrentWeekPackage] = useState<WeeklySchedulePackage | null>(null);
  const [archivedPackages, setArchivedPackages] = useState<WeeklySchedulePackage[]>([]);
  const [currentWeekRange, setCurrentWeekRange] = useState<{ wedStr: string; sunStr: string; isNewWeekStarting: boolean; todayStr: string }>(() => getCurrentChurchWeekRange());
  const [weeklySectionTab, setWeeklySectionTab] = useState<'active' | 'archive'>('active');
  const [selectedWeekId, setSelectedWeekId] = useState<string>('');
  const [isWeeklyModalOpen, setIsWeeklyModalOpen] = useState(false);
  const [editingWeekly, setEditingWeekly] = useState<WeeklySchedulePackage | null>(null);
  
  // Weekly modal fields
  const [weeklyWedDate, setWeeklyWedDate] = useState<string>('');
  const [weeklyTitle, setWeeklyTitle] = useState<string>('');
  const [weeklyServices, setWeeklyServices] = useState<WeeklyServiceItem[]>([]);
  const [weeklyAnnouncements, setWeeklyAnnouncements] = useState<string>('');
  const [copiedScheduleText, setCopiedScheduleText] = useState(false);

  // --- INDIVIDUAL INKHAWM PROGRAMME STATES ---
  const [programs, setPrograms] = useState<InkhawmProgramme[]>([]);
  const [isInkhawmModalOpen, setIsInkhawmModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<InkhawmProgramme | null>(null);
  const [title, setTitle] = useState(PROGRAM_TITLES[0]);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [roles, setRoles] = useState<{ role: string; value: string }[]>([]);

  // --- TAWNGTAI INKHAWM STATES ---
  const [tawngtaiMonths, setTawngtaiMonths] = useState<TawngtaiHruaituMonth[]>([]);
  const [selectedMonthId, setSelectedMonthId] = useState<string>('');
  const [isTawngtaiModalOpen, setIsTawngtaiModalOpen] = useState(false);
  const [editingTawngtai, setEditingTawngtai] = useState<TawngtaiHruaituMonth | null>(null);
  const [tawngtaiYearMonth, setTawngtaiYearMonth] = useState('');
  const [tawngtaiDays, setTawngtaiDays] = useState<TawngtaiHruaituDay[]>([]);

  useEffect(() => {
    fetchWeeklyPackages();
    fetchPrograms();
    fetchTawngtaiMonths();
  }, []);

  // Handle deep linking to a specific week package via ?week=<id>
  useEffect(() => {
    if (weekParam && weeklyPackages.length > 0) {
      const found = weeklyPackages.find(p => p.id === weekParam);
      if (found) {
        setSelectedWeekId(found.id);
        setActiveTab('weekly');
        if (currentWeekPackage && found.id === currentWeekPackage.id) {
          setWeeklySectionTab('active');
        } else {
          setWeeklySectionTab('archive');
        }
      }
    } else if (!weekParam) {
      setWeeklySectionTab('active');
    }
  }, [weekParam, weeklyPackages, currentWeekPackage]);

  // Dynamic SEO metadata synchronization
  useEffect(() => {
    const activeDoc = weeklySectionTab === 'active' ? currentWeekPackage : (weeklyPackages.find(p => p.id === selectedWeekId) || null);
    if (activeDoc) {
      const { snippet } = generateWeeklyShareData(activeDoc);
      updateDocumentMetadata({
        title: activeDoc.title,
        description: snippet || `Bethlehem Kohhran weekly schedule: ${activeDoc.title}`,
        url: `/programs?week=${activeDoc.id}`,
        type: 'article',
      });
    } else {
      updateDocumentMetadata({
        title: 'Inkhawm Programme - Bethlehem Kohhran',
        description: 'Bethlehem Kohhran inkhawm programme kimchang, weekly schedule, leh tawngtai inkhawm hruaitute.',
        url: '/programs',
        type: 'website',
      });
    }
  }, [selectedWeekId, weeklyPackages, weeklySectionTab, currentWeekPackage]);

  useEffect(() => {
    if (!editingProgram) {
      setRoles(DEFAULT_PROGRAM_ROLES[title]?.map(r => ({ role: r, value: '' })) || []);
    }
  }, [title, editingProgram]);

  // --- FETCHING DATA ---
  const fetchAllProgramsAndPackages = async () => {
    // Clear any obsolete local dummy package storage
    try {
      localStorage.removeItem('local_weekly_schedules');
    } catch (e) {}

    setLoading(true);
    try {
      let rawDocs: any[] = [];
      if (isFirebaseConfigured && db) {
        const q = query(collection(db, 'programs'), orderBy('date', 'desc'));
        const snapshot = await getDocs(q);
        rawDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        const local = localStorage.getItem('local_programs');
        if (local) {
          try {
            rawDocs = JSON.parse(local);
          } catch (e) {}
        }
      }

      const { 
        packages, 
        currentWeekPackage: activePkg, 
        archivedPackages: pastPkgs, 
        individualPrograms, 
        currentWeekRange: rangeInfo 
      } = buildWeeklyPackages(rawDocs);
      
      setPrograms(individualPrograms);
      setWeeklyPackages(packages);
      setCurrentWeekPackage(activePkg);
      setArchivedPackages(pastPkgs);
      setCurrentWeekRange(rangeInfo);

      if (packages.length > 0) {
        if (activePkg) {
          setSelectedWeekId(activePkg.id);
        } else {
          setSelectedWeekId('');
        }
      }
    } catch (error) {
      console.error("Error fetching programs and weekly packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyPackages = fetchAllProgramsAndPackages;
  const fetchPrograms = fetchAllProgramsAndPackages;

  const fetchTawngtaiMonths = async () => {
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_tawngtai');
      if (local) {
        const data = JSON.parse(local);
        setTawngtaiMonths(data);
        if (data.length > 0) setSelectedMonthId(data[0].id);
      }
      setLoading(false);
      return;
    }
    try {
      const q = query(collection(db, 'tawngtai'), orderBy('yearMonth', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TawngtaiHruaituMonth));
      setTawngtaiMonths(data);
      if (data.length > 0) {
        if (!selectedMonthId || !data.find(m => m.id === selectedMonthId)) {
          setSelectedMonthId(data[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching tawngtai:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- WEEKLY SCHEDULE PACKAGE ACTIONS ---

  const handleOpenWeeklyModal = (pkg?: WeeklySchedulePackage, forceBlankForCurrentWeek?: boolean) => {
    if (pkg && !forceBlankForCurrentWeek) {
      setEditingWeekly(pkg);
      setWeeklyWedDate(pkg.startDate);
      setWeeklyTitle(pkg.title);
      setWeeklyServices(JSON.parse(JSON.stringify(pkg.services)));
      setWeeklyAnnouncements(pkg.announcements || '');
    } else {
      // Whenever a new week starts (Monday onwards), prepare a fresh blank program page to be filled by admin
      const targetWed = currentWeekRange?.wedStr || getCurrentChurchWeekRange().wedStr;
      const blankTemplate = createBlankWeeklyPackageTemplate(targetWed);
      
      setEditingWeekly(null);
      setWeeklyWedDate(blankTemplate.startDate);
      setWeeklyTitle(blankTemplate.title);
      setWeeklyServices(blankTemplate.services);
      setWeeklyAnnouncements('');
    }
    setIsWeeklyModalOpen(true);
  };

  const handleResetToBlankTemplate = () => {
    const targetWed = weeklyWedDate || currentWeekRange?.wedStr || getCurrentChurchWeekRange().wedStr;
    const blankTemplate = createBlankWeeklyPackageTemplate(targetWed);
    setWeeklyServices(blankTemplate.services);
    setWeeklyAnnouncements('');
    setWeeklyTitle(blankTemplate.title);
  };

  const handleSetPresetWeek = (preset: 'thisWeek' | 'nextWeek') => {
    const currentWed = currentWeekRange?.wedStr || getCurrentChurchWeekRange().wedStr;
    const targetWed = preset === 'thisWeek' ? currentWed : addDaysToDateString(currentWed, 7);
    handleWeeklyWedDateChange(targetWed);
  };

  const handleWeeklyWedDateChange = (newWedDate: string) => {
    setWeeklyWedDate(newWedDate);
    if (!newWedDate) return;

    const sunDate = addDaysToDateString(newWedDate, 4);
    setWeeklyTitle(`Tun Kar Kohhran Inkhawm Programme (${formatDateRange(newWedDate, sunDate)})`);

    // Automatically recalculate dates for standard services while keeping entered role values!
    setWeeklyServices(prev => prev.map((s, idx) => {
      let updatedDate = s.date;
      if (idx === 0 || s.dayShort.toLowerCase().includes('nilai')) {
        updatedDate = newWedDate;
      } else if (idx === 1 || s.dayShort.toLowerCase().includes('inrinni')) {
        updatedDate = addDaysToDateString(newWedDate, 3);
      } else if (s.dayShort.toLowerCase().includes('pathianni')) {
        updatedDate = sunDate;
      }
      return { ...s, date: updatedDate };
    }));
  };

  const handleWeeklyServiceFieldChange = (
    srvIndex: number, 
    field: 'dayTitle' | 'dayShort' | 'date' | 'time' | 'notes', 
    val: string
  ) => {
    const updated = [...weeklyServices];
    updated[srvIndex][field] = val;
    setWeeklyServices(updated);
  };

  const handleWeeklyRoleChange = (
    srvIndex: number, 
    roleIndex: number, 
    field: 'role' | 'value', 
    val: string
  ) => {
    const updated = [...weeklyServices];
    updated[srvIndex].roles[roleIndex][field] = val;
    setWeeklyServices(updated);
  };

  const handleAddRoleToWeeklyService = (srvIndex: number) => {
    const updated = [...weeklyServices];
    updated[srvIndex].roles.push({ role: 'Rawngbawltu', value: '' });
    setWeeklyServices(updated);
  };

  const handleRemoveRoleFromWeeklyService = (srvIndex: number, roleIndex: number) => {
    const updated = [...weeklyServices];
    updated[srvIndex].roles.splice(roleIndex, 1);
    setWeeklyServices(updated);
  };

  const handleAddCustomServiceToWeek = () => {
    const newService: WeeklyServiceItem = {
      id: 'custom_' + Date.now(),
      dayShort: 'Thawhtanni Zan (KTP)',
      dayTitle: 'Thawhtanni Zan (KTP Inkhawm)',
      date: weeklyWedDate ? addDaysToDateString(weeklyWedDate, -2) : '',
      time: '19:00',
      roles: [
        { role: 'Hruaitu', value: '' },
        { role: 'Tantu', value: '' },
        { role: 'Thuhriltu', value: '' }
      ]
    };
    setWeeklyServices([...weeklyServices, newService]);
  };

  const handleRemoveServiceFromWeek = (srvIndex: number) => {
    if (!confirm("Are you sure you want to remove this service from this weekly package?")) return;
    const updated = [...weeklyServices];
    updated.splice(srvIndex, 1);
    setWeeklyServices(updated);
  };

  const handleSaveWeeklyPackage = async () => {
    if (!weeklyWedDate) {
      alert("Please select Wednesday date for this weekly package.");
      return;
    }

    const sunDate = addDaysToDateString(weeklyWedDate, 4);
    const packagePayload: Omit<WeeklySchedulePackage, 'id'> = {
      isWeeklyPackage: true,
      title: weeklyTitle.trim() || `Tun Kar Kohhran Inkhawm Programme (${formatDateRange(weeklyWedDate, sunDate)})`,
      startDate: weeklyWedDate,
      endDate: sunDate,
      services: weeklyServices,
      announcements: weeklyAnnouncements.trim(),
      updatedAt: new Date().toISOString()
    };

    if (!isFirebaseConfigured || !db) {
      const updated = [...weeklyPackages];
      let assignedId = editingWeekly?.id;
      if (assignedId) {
        const idx = updated.findIndex(p => p.id === assignedId);
        if (idx !== -1) updated[idx] = { id: assignedId, ...packagePayload };
      } else {
        assignedId = 'local_week_' + Date.now();
        updated.unshift({ id: assignedId, ...packagePayload, createdAt: new Date().toISOString() });
      }
      updated.sort((a, b) => b.startDate.localeCompare(a.startDate));
      localStorage.setItem('local_weekly_schedules', JSON.stringify(updated));
      setWeeklyPackages(updated);
      setSelectedWeekId(assignedId);
      setIsWeeklyModalOpen(false);
      return;
    }

    try {
      let savedId = editingWeekly?.id;
      if (savedId && !savedId.startsWith('week_')) {
        await updateDoc(doc(db, 'programs', savedId), packagePayload);
      } else {
        const docRef = await addDoc(collection(db, 'programs'), {
          ...packagePayload,
          createdAt: new Date().toISOString()
        });
        savedId = docRef.id;
      }

      // Also update any individual services that were edited in the weekly package
      for (const srv of weeklyServices) {
        if (srv.id && !srv.id.includes('_')) {
          try {
            await updateDoc(doc(db, 'programs', srv.id), {
              title: srv.dayShort || srv.dayTitle,
              date: srv.date,
              time: srv.time,
              roles: srv.roles,
              ...(srv.notes ? { notes: srv.notes } : {})
            });
          } catch (e) {}
        }
      }

      setIsWeeklyModalOpen(false);
      await fetchAllProgramsAndPackages();
      if (savedId) {
        setSelectedWeekId(savedId);
      }
    } catch (error: any) {
      console.error("Error saving weekly schedule package:", error);
      alert("Failed to save weekly schedule package. Please try again.");
    }
  };

  const handleDeleteWeeklyPackage = async (id: string) => {
    const pkgToDelete = weeklyPackages.find(p => p.id === id);
    if (!pkgToDelete) return;

    if (!confirm(`Are you sure you want to delete the schedule for "${pkgToDelete.title}"?`)) return;

    if (!isFirebaseConfigured || !db) {
      const updated = weeklyPackages.filter(p => p.id !== id);
      setWeeklyPackages(updated);
      if (selectedWeekId === id) {
        setSelectedWeekId(updated[0]?.id || '');
      }
      return;
    }

    try {
      if (id.startsWith('week_')) {
        for (const srv of pkgToDelete.services) {
          if (srv.id && !srv.id.includes('_')) {
            await deleteDoc(doc(db, 'programs', srv.id)).catch(() => {});
          }
        }
      } else {
        await deleteDoc(doc(db, 'programs', id));
      }

      await fetchAllProgramsAndPackages();
    } catch (error) {
      console.error("Error deleting weekly schedule package:", error);
      alert("Failed to delete package.");
    }
  };

  // Instant 1-click clipboard copy of the entire weekly bulletin text
  const handleCopyBulletinText = async (text: string) => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      } else {
        const el = document.createElement('textarea');
        el.value = text;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedScheduleText(true);
      setTimeout(() => setCopiedScheduleText(false), 2500);
    } catch (e) {
      console.error("Copy failed", e);
    }
  };

  // --- INDIVIDUAL INKHAWM PROGRAMME ACTIONS ---
  const handleOpenInkhawmModal = (program?: InkhawmProgramme) => {
    if (program) {
      setEditingProgram(program);
      setTitle(program.title);
      setDate(program.date);
      setTime(program.time);
      setRoles([...program.roles]);
    } else {
      setEditingProgram(null);
      setTitle(PROGRAM_TITLES[0]);
      const targetWed = currentWeekRange?.wedStr || getCurrentChurchWeekRange().wedStr;
      setDate(targetWed);
      setTime('19:00');
      setRoles(DEFAULT_PROGRAM_ROLES[PROGRAM_TITLES[0]].map(r => ({ role: r, value: '' })));
    }
    setIsInkhawmModalOpen(true);
  };

  const handleAddRole = () => setRoles([...roles, { role: 'Extra Field', value: '' }]);
  const handleRoleChange = (index: number, field: 'role' | 'value', val: string) => {
    const newRoles = [...roles];
    newRoles[index][field] = val;
    setRoles(newRoles);
  };
  const handleRemoveRole = (index: number) => {
    const newRoles = [...roles];
    newRoles.splice(index, 1);
    setRoles(newRoles);
  };

  const handleSaveInkhawm = async () => {
    const programData = { title, date, time, roles };
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_programs');
      const list: InkhawmProgramme[] = local ? JSON.parse(local) : [];
      if (editingProgram?.id) {
        const idx = list.findIndex(p => p.id === editingProgram.id);
        if (idx !== -1) list[idx] = { ...editingProgram, ...programData };
      } else {
        list.unshift({ id: 'local_prog_' + Date.now(), ...programData });
      }
      localStorage.setItem('local_programs', JSON.stringify(list));
      setPrograms(list);
      setIsInkhawmModalOpen(false);
      return;
    }
    try {
      if (editingProgram?.id) {
        await updateDoc(doc(db, 'programs', editingProgram.id), programData);
      } else {
        await addDoc(collection(db, 'programs'), programData);
      }
      setIsInkhawmModalOpen(false);
      fetchPrograms();
    } catch (error) {
      console.error("Error saving program:", error);
      alert("Failed to save program.");
    }
  };

  const handleDeleteInkhawm = async (id: string) => {
    if (!confirm("Are you sure you want to delete this programme?")) return;
    if (!isFirebaseConfigured || !db) return;
    try {
      await deleteDoc(doc(db, 'programs', id));
      fetchPrograms();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  // --- TAWNGTAI INKHAWM ACTIONS ---
  const generateDaysForMonth = (ym: string): TawngtaiHruaituDay[] => {
    if (!ym) return [];
    const [y, m] = ym.split('-');
    const year = parseInt(y);
    const month = parseInt(m) - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: TawngtaiHruaituDay[] = [];
    const mizoDays = ['Pathianni', 'Thawhtanni', 'Thawhlehni', 'Nilaini', 'Ningani', 'Zirtawpni', 'Inrinni'];
    
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({
        date: i,
        dayName: mizoDays[d.getDay()],
        zingLeader: '',
        tlaiLeader: ''
      });
    }
    return days;
  };

  const handleOpenTawngtaiModal = (monthData?: TawngtaiHruaituMonth) => {
    if (monthData) {
      setEditingTawngtai(monthData);
      setTawngtaiYearMonth(monthData.yearMonth);
      setTawngtaiDays([...monthData.days]);
    } else {
      setEditingTawngtai(null);
      const currentYm = new Date().toISOString().slice(0, 7);
      setTawngtaiYearMonth(currentYm);
      setTawngtaiDays(generateDaysForMonth(currentYm));
    }
    setIsTawngtaiModalOpen(true);
  };

  const handleTawngtaiYearMonthChange = (val: string) => {
    setTawngtaiYearMonth(val);
    setTawngtaiDays(generateDaysForMonth(val));
  };

  const handleTawngtaiDayChange = (index: number, field: 'zingLeader' | 'tlaiLeader', val: string) => {
    const newDays = [...tawngtaiDays];
    newDays[index][field] = val;
    setTawngtaiDays(newDays);
  };

  const handleSaveTawngtai = async () => {
    if (!tawngtaiYearMonth) return;
    const data = { yearMonth: tawngtaiYearMonth, days: tawngtaiDays };

    if (!isFirebaseConfigured || !db) {
      const updated = [...tawngtaiMonths];
      if (editingTawngtai) {
        const idx = updated.findIndex(m => m.id === editingTawngtai.id);
        if (idx !== -1) updated[idx] = { ...editingTawngtai, ...data };
      } else {
        updated.push({ id: 'local_tawngtai_' + Date.now(), ...data });
      }
      updated.sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));
      localStorage.setItem('local_tawngtai', JSON.stringify(updated));
      setTawngtaiMonths(updated);
      setIsTawngtaiModalOpen(false);
      if (!editingTawngtai) setSelectedMonthId(updated[0].id);
      return;
    }

    try {
      if (editingTawngtai?.id) {
        await updateDoc(doc(db, 'tawngtai', editingTawngtai.id), data);
      } else {
        await addDoc(collection(db, 'tawngtai'), data);
      }
      setIsTawngtaiModalOpen(false);
      fetchTawngtaiMonths();
    } catch (error) {
      console.error("Error saving tawngtai:", error);
      alert("Failed to save tawngtai hruaitu.");
    }
  };

  const handleDeleteTawngtai = async (id: string) => {
    if (!confirm("Are you sure you want to delete this month's record?")) return;
    if (!isFirebaseConfigured || !db) {
      const updated = tawngtaiMonths.filter(m => m.id !== id);
      localStorage.setItem('local_tawngtai', JSON.stringify(updated));
      setTawngtaiMonths(updated);
      if (selectedMonthId === id) setSelectedMonthId(updated[0]?.id || '');
      return;
    }
    try {
      await deleteDoc(doc(db, 'tawngtai', id));
      fetchTawngtaiMonths();
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const formatMonthName = (ym: string) => {
    if (!ym) return '';
    const [y, m] = ym.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  const selectedMonthData = tawngtaiMonths.find(m => m.id === selectedMonthId);
  const currentWeekData = weeklySectionTab === 'active' 
    ? currentWeekPackage 
    : (weeklyPackages.find(p => p.id === selectedWeekId) || archivedPackages[0] || null);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight uppercase">Programmes</h1>
          <p className="mt-1 text-stone-500 font-sans text-xs uppercase tracking-widest">
            Church service packages & prayer meeting schedules
          </p>
        </div>

        {isAdmin && activeTab === 'weekly' && (
          <button 
            onClick={() => handleOpenWeeklyModal()}
            className="bg-[#5A5A40] text-white px-4 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2 shrink-0 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add Tun Kar Inkhawm Programme
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-[#e0e0d5] pb-px overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('weekly')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'weekly' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Tun Kar Kohhran Inkhawm Programme
        </button>
        <button 
          onClick={() => setActiveTab('inkhawm')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'inkhawm' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          All Services (Malte)
        </button>
        <button 
          onClick={() => setActiveTab('tawngtai')}
          className={`px-5 py-3 text-xs uppercase font-bold tracking-widest transition-colors border-b-2 whitespace-nowrap ${
            activeTab === 'tawngtai' ? 'border-[#5A5A40] text-[#5A5A40]' : 'border-transparent text-stone-400 hover:text-stone-600'
          }`}
        >
          Ṭawngṭai Inkhawm Hruaitu
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-stone-500 font-sans">Loading schedules...</div>
      ) : activeTab === 'weekly' ? (
        <div className="space-y-6">
          {/* Sub-header controls: Active Week vs Archive Selector */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-[#e0e0d5] shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setWeeklySectionTab('active');
                  if (currentWeekPackage) setSelectedWeekId(currentWeekPackage.id);
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition font-sans ${
                  weeklySectionTab === 'active'
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tun Kar Programme</span>
                {currentWeekPackage ? (
                  <span className="bg-white/20 text-[10px] px-1.5 py-0.5 rounded-full font-mono">Active</span>
                ) : (
                  <span className="bg-amber-500/20 text-amber-900 text-[10px] px-1.5 py-0.5 rounded-full font-mono">Thar / Blank</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setWeeklySectionTab('archive');
                  if (archivedPackages.length > 0 && (!selectedWeekId || selectedWeekId === currentWeekPackage?.id)) {
                    setSelectedWeekId(archivedPackages[0].id);
                  }
                }}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs uppercase font-bold tracking-wider transition font-sans ${
                  weeklySectionTab === 'archive'
                    ? 'bg-[#5A5A40] text-white shadow-xs'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Hmasa Lam Archive ({archivedPackages.length})</span>
              </button>
            </div>

            {/* Archive Week Selector Dropdown (when in Archive mode) */}
            {weeklySectionTab === 'archive' && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
                <select
                  value={selectedWeekId}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-xs font-bold text-[#5A5A40] uppercase tracking-wider py-2 px-3 focus:ring-1 focus:ring-[#5A5A40] cursor-pointer"
                >
                  {archivedPackages.length === 0 ? (
                    <option value="">-- No archived weeks yet --</option>
                  ) : (
                    archivedPackages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {formatDateRange(p.startDate, p.endDate)} (Archived)
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* Quick Share Link of 1 Week Schedule (One-Button Share) */}
            {currentWeekData && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {(() => {
                  const shareData = generateWeeklyShareData(currentWeekData);
                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyBulletinText(shareData.fullText)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs uppercase font-bold tracking-wider text-stone-600 hover:text-[#5A5A40] bg-stone-100 hover:bg-stone-200 transition font-sans"
                        title="Copy full weekly bulletin text & link"
                      >
                        {copiedScheduleText ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-stone-500" />
                            <span>Copy Text</span>
                          </>
                        )}
                      </button>

                      <ShareButton
                        title={`Bethlehem Kohhran: ${currentWeekData.title}`}
                        headerTitle="Share 1-Week Schedule"
                        customMessage={shareData.fullText}
                        customSnippet={shareData.snippet}
                        url={`/programs?week=${currentWeekData.id}`}
                        variant="pill"
                        buttonText="Share 1-Week Schedule"
                        className="bg-[#5A5A40] text-white hover:bg-[#4a4a35] hover:text-white"
                      />
                    </>
                  );
                })()}

                {isAdmin && (
                  <div className="flex gap-1.5 ml-1 border-l border-stone-200 pl-2">
                    <button 
                      onClick={() => handleOpenWeeklyModal(currentWeekData)}
                      className="p-2 text-stone-400 hover:text-[#5A5A40] bg-[#fcfaf7] border border-[#ecece0] rounded-xl transition"
                      title="Edit Weekly Schedule"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteWeeklyPackage(currentWeekData.id)}
                      className="p-2 text-red-400 hover:text-red-600 bg-red-50 border border-red-100 rounded-xl transition"
                      title="Delete Weekly Schedule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ACTIVE WEEK VIEW */}
          {weeklySectionTab === 'active' && (
            <>
              {currentWeekPackage ? (
                /* Active Package Showcase */
                <div className="bg-white rounded-[32px] border border-[#e0e0d5] overflow-hidden shadow-sm">
                  {/* Package Header Banner */}
                  <div className="p-6 sm:p-8 bg-gradient-to-b from-[#fcfaf7] to-white border-b border-[#ecece0]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 font-sans">
                          <Sparkles className="w-3 h-3" />
                          Tun Kar Programme • Nilaini Zan atanga Pathianni Zan
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif text-[#2d2d2a] tracking-tight">
                          {currentWeekPackage.title}
                        </h2>
                        <p className="mt-1 text-xs text-stone-500 font-sans tracking-wide">
                          🗓️ {formatDateRange(currentWeekPackage.startDate, currentWeekPackage.endDate)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(() => {
                          const shareData = generateWeeklyShareData(currentWeekPackage);
                          return (
                            <ShareButton
                              title={`Bethlehem Kohhran: ${currentWeekPackage.title}`}
                              headerTitle="Share 1-Week Schedule"
                              customMessage={shareData.fullText}
                              customSnippet={shareData.snippet}
                              url={`/programs?week=${currentWeekPackage.id}`}
                              variant="button"
                              buttonText="Share 1-Week Link"
                              className="bg-[#5A5A40] text-white hover:bg-[#4a4a35] hover:text-white"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Package Services Grid (Nilaini Zan to Pathianni Zan in chronological order) */}
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {currentWeekPackage.services.map((srv, index) => {
                        const isSunday = srv.dayShort.toLowerCase().includes('pathianni');
                        const isWednesday = srv.dayShort.toLowerCase().includes('nilai');

                        return (
                          <div 
                            key={srv.id || index}
                            className={`rounded-2xl border transition p-5 flex flex-col justify-between ${
                              isSunday 
                                ? 'bg-[#fcfaf7] border-[#d8d8c8] shadow-xs' 
                                : isWednesday
                                ? 'bg-white border-[#e0e0d5] hover:border-[#5A5A40]/40'
                                : 'bg-white border-[#e0e0d5] hover:border-[#5A5A40]/40'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans ${
                                  isSunday 
                                    ? 'bg-[#5A5A40] text-white' 
                                    : 'bg-stone-100 text-[#5A5A40]'
                                }`}>
                                  {srv.dayShort}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 font-sans">
                                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                                  <span>{formatTimeDisplay(srv.time)}</span>
                                </div>
                              </div>

                              <h3 className="text-base font-serif font-semibold text-[#2d2d2a] mb-1">
                                {srv.dayTitle}
                              </h3>
                              <p className="text-[11px] text-stone-400 font-sans mb-4">
                                {formatMizoDate(srv.date)}
                              </p>

                              <div className="space-y-2.5 pt-2 border-t border-[#ecece0] font-sans">
                                {srv.roles.map((r, rIdx) => (
                                  <div key={rIdx} className="text-xs flex items-start gap-2">
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider shrink-0 w-28">
                                      {r.role}:
                                    </span>
                                    <span className={`font-semibold ${r.value ? 'text-stone-800' : 'text-stone-400 italic'}`}>
                                      {r.value || 'TBA'}
                                    </span>
                                  </div>
                                ))}

                                {srv.notes && (
                                  <div className="text-xs pt-1 text-stone-500 italic flex items-start gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                                    <span>{srv.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {currentWeekPackage.announcements && (
                      <div className="bg-[#fcfaf7] border border-[#ecece0] rounded-2xl p-5 sm:p-6 font-sans">
                        <div className="flex items-center gap-2 mb-2 text-[#5A5A40]">
                          <Bell className="w-4 h-4 text-[#5A5A40]" />
                          <h4 className="text-xs uppercase font-bold tracking-widest text-[#5A5A40]">
                            Weekly Announcements & Notices (Hriattirnate)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed pl-6">
                          {currentWeekPackage.announcements}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* New Week Started - Blank Template Ready for Admin */
                <div className="bg-white rounded-[32px] border border-[#e0e0d5] overflow-hidden shadow-sm p-6 sm:p-10 space-y-6">
                  <div className="bg-gradient-to-r from-amber-50 to-stone-50 p-6 rounded-2xl border border-amber-200/70 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-[#5A5A40] text-white rounded-full text-[10px] font-bold uppercase tracking-wider font-sans">
                        <Sparkles className="w-3 h-3" />
                        New Week Started (Thawhtanni)
                      </div>
                      <h3 className="text-xl sm:text-2xl font-serif text-[#2d2d2a] font-semibold">
                        Tun Kar Kohhran Inkhawm Programme ({formatDateRange(currentWeekRange.wedStr, currentWeekRange.sunStr)})
                      </h3>
                      <p className="text-xs text-stone-600 font-sans max-w-2xl">
                        Kar kalta programme chu <strong>Hmasa Lam Archive</strong>-ah dah a ni tawh a. Tun kar programme ({currentWeekRange.wedStr} atanga {currentWeekRange.sunStr}) atan blank programme template a inpeih e.
                      </p>
                    </div>

                    {isAdmin ? (
                      <button
                        type="button"
                        onClick={() => handleOpenWeeklyModal(undefined, true)}
                        className="bg-[#5A5A40] text-white hover:bg-[#4a4a35] px-6 py-3 rounded-2xl text-xs uppercase font-bold tracking-wider transition shadow-sm inline-flex items-center gap-2 shrink-0 font-sans"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Fill Tun Kar Programme</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setWeeklySectionTab('archive');
                          if (archivedPackages.length > 0) setSelectedWeekId(archivedPackages[0].id);
                        }}
                        className="bg-stone-200 hover:bg-stone-300 text-stone-800 px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-wider transition font-sans inline-flex items-center gap-2 shrink-0"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>View Past Weeks (Archive)</span>
                      </button>
                    )}
                  </div>

                  {/* Visual Preview of the Blank Services for the Upcoming Week */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] uppercase font-bold tracking-widest text-stone-400 font-sans">
                        5 Standard Inkhawm Slots for this week (Nilaini – Pathianni)
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenWeeklyModal(undefined, true)}
                          className="text-xs font-bold text-[#5A5A40] uppercase tracking-wider hover:underline font-sans"
                        >
                          + Open Full Editor & Fill Roles
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      {[
                        { title: 'Nilaini Zan', date: currentWeekRange.wedStr, roles: 'Hruaitu, Tantu, Thupui Hawngtu, Thupui' },
                        { title: 'Inrinni Zan', date: addDaysToDateString(currentWeekRange.wedStr, 3), roles: 'Hruaitu, Tantu, Thuhriltu' },
                        { title: 'Pathianni Chawhma', date: currentWeekRange.sunStr, roles: 'Tantu, Zirlai, Zirtirtu' },
                        { title: 'Pathianni Chawhnu', date: currentWeekRange.sunStr, roles: 'Tantu, Thuhriltu' },
                        { title: 'Pathianni Zan', date: currentWeekRange.sunStr, roles: 'Thuhriltu, Hruaitu' },
                      ].map((slot, sIdx) => (
                        <div 
                          key={sIdx}
                          onClick={() => { if (isAdmin) handleOpenWeeklyModal(undefined, true); }}
                          className={`p-4 rounded-2xl border border-dashed border-[#ecece0] bg-[#fcfaf7] transition ${
                            isAdmin ? 'cursor-pointer hover:border-[#5A5A40] hover:bg-stone-50' : ''
                          }`}
                        >
                          <span className="text-[10px] font-bold uppercase text-[#5A5A40] block">{slot.title}</span>
                          <span className="text-[11px] text-stone-500 font-mono block mt-0.5">{slot.date}</span>
                          <span className="text-[10px] text-stone-400 italic block mt-2">{slot.roles}</span>
                          <span className="inline-block mt-3 text-[9px] font-bold uppercase px-2 py-0.5 bg-stone-200/70 text-stone-600 rounded">
                            {isAdmin ? 'Click to fill' : 'TBA'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ARCHIVE WEEKS VIEW */}
          {weeklySectionTab === 'archive' && (
            <>
              {currentWeekData ? (
                <div className="bg-white rounded-[32px] border border-[#e0e0d5] overflow-hidden shadow-sm">
                  {/* Archive Header Banner */}
                  <div className="p-6 sm:p-8 bg-gradient-to-b from-stone-100 to-white border-b border-[#ecece0]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-stone-200 text-stone-700 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 font-sans">
                          <BookOpen className="w-3 h-3" />
                          Archived Weekly Schedule (Hmasa Lam)
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-serif text-[#2d2d2a] tracking-tight">
                          {currentWeekData.title}
                        </h2>
                        <p className="mt-1 text-xs text-stone-500 font-sans tracking-wide">
                          🗓️ {formatDateRange(currentWeekData.startDate, currentWeekData.endDate)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {(() => {
                          const shareData = generateWeeklyShareData(currentWeekData);
                          return (
                            <ShareButton
                              title={`Bethlehem Kohhran: ${currentWeekData.title}`}
                              headerTitle="Share Archived Schedule"
                              customMessage={shareData.fullText}
                              customSnippet={shareData.snippet}
                              url={`/programs?week=${currentWeekData.id}`}
                              variant="button"
                              buttonText="Share Archive Link"
                              className="bg-[#5A5A40] text-white hover:bg-[#4a4a35] hover:text-white"
                            />
                          );
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Services Grid */}
                  <div className="p-6 sm:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {currentWeekData.services.map((srv, index) => {
                        const isSunday = srv.dayShort.toLowerCase().includes('pathianni');
                        const isWednesday = srv.dayShort.toLowerCase().includes('nilai');

                        return (
                          <div 
                            key={srv.id || index}
                            className={`rounded-2xl border transition p-5 flex flex-col justify-between ${
                              isSunday 
                                ? 'bg-[#fcfaf7] border-[#d8d8c8] shadow-xs' 
                                : isWednesday
                                ? 'bg-white border-[#e0e0d5]' 
                                : 'bg-white border-[#e0e0d5]'
                            }`}
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2 mb-3">
                                <span className="inline-block px-2.5 py-1 rounded-lg text-[10px] uppercase font-bold tracking-wider font-sans bg-stone-100 text-[#5A5A40]">
                                  {srv.dayShort}
                                </span>
                                <div className="flex items-center gap-1.5 text-xs font-bold text-stone-600 font-sans">
                                  <Clock className="w-3.5 h-3.5 text-stone-400" />
                                  <span>{formatTimeDisplay(srv.time)}</span>
                                </div>
                              </div>

                              <h3 className="text-base font-serif font-semibold text-[#2d2d2a] mb-1">
                                {srv.dayTitle}
                              </h3>
                              <p className="text-[11px] text-stone-400 font-sans mb-4">
                                {formatMizoDate(srv.date)}
                              </p>

                              <div className="space-y-2.5 pt-2 border-t border-[#ecece0] font-sans">
                                {srv.roles.map((r, rIdx) => (
                                  <div key={rIdx} className="text-xs flex items-start gap-2">
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider shrink-0 w-28">
                                      {r.role}:
                                    </span>
                                    <span className="font-semibold text-stone-800">
                                      {r.value || 'TBA'}
                                    </span>
                                  </div>
                                ))}

                                {srv.notes && (
                                  <div className="text-xs pt-1 text-stone-500 italic flex items-start gap-1.5">
                                    <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                                    <span>{srv.notes}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {currentWeekData.announcements && (
                      <div className="bg-[#fcfaf7] border border-[#ecece0] rounded-2xl p-5 sm:p-6 font-sans">
                        <div className="flex items-center gap-2 mb-2 text-[#5A5A40]">
                          <Bell className="w-4 h-4 text-[#5A5A40]" />
                          <h4 className="text-xs uppercase font-bold tracking-widest text-[#5A5A40]">
                            Weekly Announcements & Notices (Hriattirnate)
                          </h4>
                        </div>
                        <p className="text-xs text-stone-700 whitespace-pre-line leading-relaxed pl-6">
                          {currentWeekData.announcements}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 bg-white border border-[#e0e0d5] rounded-3xl p-8 space-y-3 font-sans">
                  <BookOpen className="w-10 h-10 text-stone-300 mx-auto" />
                  <h3 className="text-base font-bold text-stone-700">No Archived Packages</h3>
                  <p className="text-xs text-stone-400">Previous week packages will appear here automatically when a new week starts.</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : activeTab === 'inkhawm' ? (
        <div className="space-y-6">
          {isAdmin && (
            <div className="flex justify-end">
              <button 
                onClick={() => handleOpenInkhawmModal()}
                className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Individual Programme
              </button>
            </div>
          )}
          <div className="grid gap-6">
            {programs.map((program) => (
              <div key={program.id} className="bg-white rounded-[32px] shadow-sm border border-[#e0e0d5] p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between mb-6">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider font-sans mb-1 block">
                      {program.date}
                    </span>
                    <h2 className="text-xl font-serif italic text-[#5A5A40]">{program.title}</h2>
                  </div>
                  <div className="flex items-center gap-2 mt-4 md:mt-0">
                    <ShareButton
                      title={`Bethlehem Kohhran: ${program.title} (${program.date})`}
                      summary={`Hun: ${formatTimeDisplay(program.time)}. ${program.roles.map(r => `${r.role}: ${r.value || 'TBA'}`).join(', ')}`}
                      url="/programs"
                      variant="pill"
                      buttonText="Share"
                    />
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenInkhawmModal(program)} className="p-2 text-stone-400 hover:text-[#5A5A40] bg-[#fcfaf7] border border-[#ecece0] rounded-xl transition">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteInkhawm(program.id)} className="p-2 text-red-400 hover:text-red-600 bg-red-50 border border-red-100 rounded-xl transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4 text-sm font-sans text-[#2d2d2a] bg-[#fcfaf7] border border-[#ecece0] p-4 rounded-2xl">
                  <div className="flex items-center space-x-3 mb-2 border-b border-[#ecece0] pb-3">
                    <Clock className="w-4 h-4 text-stone-400" />
                    <span className="font-semibold text-[#5A5A40]">{formatTimeDisplay(program.time)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                    {program.roles.map((r, i) => (
                      <div key={i} className="flex items-start space-x-3">
                        <User className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="block text-[10px] uppercase font-bold text-stone-400 tracking-widest">{r.role}</span>
                          <span className="font-semibold">{r.value || 'TBA'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {programs.length === 0 && (
               <div className="text-center py-12 text-stone-500 font-sans italic">No individual programmes found.</div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-[#e0e0d5] shadow-sm">
            <div className="flex items-center gap-4 w-full max-w-sm">
              <Calendar className="w-5 h-5 text-stone-400 shrink-0" />
              <select
                value={selectedMonthId}
                onChange={(e) => setSelectedMonthId(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-[#5A5A40] uppercase tracking-widest p-0 cursor-pointer"
              >
                {tawngtaiMonths.length === 0 ? (
                  <option value="">-- No records --</option>
                ) : (
                  tawngtaiMonths.map(m => (
                    <option key={m.id} value={m.id}>{formatMonthName(m.yearMonth)}</option>
                  ))
                )}
              </select>
            </div>
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                {selectedMonthData && (
                  <>
                    <button 
                      onClick={() => handleOpenTawngtaiModal(selectedMonthData)}
                      className="p-2.5 text-stone-400 hover:text-[#5A5A40] bg-[#fcfaf7] border border-[#ecece0] rounded-xl transition"
                      title="Edit Month"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteTawngtai(selectedMonthData.id)}
                      className="p-2.5 text-red-400 hover:text-red-600 bg-red-50 border border-red-100 rounded-xl transition"
                      title="Delete Month"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button 
                  onClick={() => handleOpenTawngtaiModal()}
                  className="bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-[10px] uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Month
                </button>
              </div>
            )}
          </div>

          {selectedMonthData ? (
            <div className="bg-white border border-[#e0e0d5] rounded-3xl overflow-hidden shadow-sm">
              <div className="p-6 text-center border-b border-[#e0e0d5] bg-[#fcfaf7] relative">
                <div className="sm:absolute sm:right-6 sm:top-6 flex justify-center mb-3 sm:mb-0">
                  <ShareButton
                    title={`Ṭawngṭai Inkhawm Hruaitu - ${formatMonthName(selectedMonthData.yearMonth)}`}
                    summary={`Bethlehem Kohhran ${formatMonthName(selectedMonthData.yearMonth)} ṭawngṭai inkhawm hruaitute ruahmanna.`}
                    url="/programs"
                    variant="pill"
                    buttonText="Share Schedule"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-serif italic text-[#5A5A40] uppercase tracking-wide">
                  Ṭawngṭai Inkhawm Hruaitu
                </h2>
                <div className="text-sm font-bold tracking-widest text-stone-500 uppercase mt-2">
                  {formatMonthName(selectedMonthData.yearMonth)}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[#ecece0] font-sans">
                  <thead className="bg-[#fcfaf7]">
                    <tr>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-[120px]">Date</th>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Zing</th>
                      <th scope="col" className="px-6 py-4 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tlai</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-[#ecece0]">
                    {selectedMonthData.days.map((day, i) => {
                      const isSunday = day.dayName === 'Pathianni';
                      return (
                        <tr key={i} className={`hover:bg-[#f5f5f0]/50 transition-colors ${isSunday ? 'bg-stone-50' : ''}`}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              <span className={`font-bold w-5 ${isSunday ? 'text-[#5A5A40]' : 'text-[#2d2d2a]'}`}>{day.date}</span>
                              <span className={`text-xs uppercase tracking-widest ${isSunday ? 'font-bold text-[#5A5A40]' : 'text-stone-500'}`}>{day.dayName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`text-sm ${isSunday ? 'font-bold text-[#5A5A40]' : 'text-[#2d2d2a]'}`}>{day.zingLeader || '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-[#2d2d2a]">
                            {!isSunday ? (day.tlaiLeader || '-') : <span className="text-stone-300">-</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500 font-sans italic bg-white border border-[#e0e0d5] rounded-3xl shadow-sm">
              No Tawngtai Inkhawm data. Add a new month to get started.
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: WEEKLY SCHEDULE PACKAGE EDITOR */}
      {isWeeklyModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-[#e0e0d5] overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#5A5A40] tracking-widest block font-sans">
                  Weekly Church Package (Nilaini Zan - Pathianni Zan)
                </span>
                <h2 className="text-xl sm:text-2xl font-serif text-[#2d2d2a]">
                  {editingWeekly ? 'Edit Weekly Schedule Package' : 'New 1-Week Schedule Package'}
                </h2>
              </div>
              <button 
                onClick={() => setIsWeeklyModalOpen(false)} 
                className="p-2 hover:bg-stone-100 rounded-full text-stone-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-6 font-sans">
              {/* Quick Week Selectors & Preset Helpers */}
              <div className="bg-[#fcfaf7] p-4 rounded-2xl border border-[#ecece0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold text-stone-500 tracking-wider">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleSetPresetWeek('thisWeek')}
                    className="px-3 py-1 bg-white hover:bg-stone-100 border border-[#ecece0] rounded-lg text-xs font-semibold text-[#5A5A40] transition"
                  >
                    🗓️ Tun Kar (This Week)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetWeek('nextWeek')}
                    className="px-3 py-1 bg-white hover:bg-stone-100 border border-[#ecece0] rounded-lg text-xs font-semibold text-[#5A5A40] transition"
                  >
                    🗓️ Kar Leh (Next Week)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleResetToBlankTemplate}
                  className="px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-lg text-xs font-semibold transition inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reset to Blank Template</span>
                </button>
              </div>

              {/* Step 1: Week Dates Configuration */}
              <div className="bg-white p-5 rounded-2xl border border-[#ecece0] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">
                    Wednesday (Nilaini Zan) Date *
                  </label>
                  <input
                    type="date"
                    value={weeklyWedDate}
                    onChange={(e) => handleWeeklyWedDateChange(e.target.value)}
                    className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#5A5A40]"
                    required
                  />
                  <p className="text-[10px] text-stone-400 mt-1">
                    Dates for Saturday and Sunday are automatically computed.
                  </p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">
                    Package Title
                  </label>
                  <input
                    type="text"
                    value={weeklyTitle}
                    onChange={(e) => setWeeklyTitle(e.target.value)}
                    placeholder="e.g. Tun Kar Kohhran Inkhawm Programme (14 - 18 Oct, 2026)"
                    className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold"
                  />
                </div>
              </div>

              {/* Step 2: The Services in the Package */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-sm uppercase font-bold tracking-wider text-[#5A5A40]">
                      Package Services (Wednesday to Sunday Night)
                    </h3>
                    <p className="text-xs text-stone-400">Fill in the assignments for each service.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomServiceToWeek}
                    className="text-[#5A5A40] text-xs uppercase font-bold tracking-wider hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Extra Service
                  </button>
                </div>

                <div className="space-y-4">
                  {weeklyServices.map((srv, srvIdx) => (
                    <div 
                      key={srv.id || srvIdx}
                      className="bg-white border border-[#ecece0] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4"
                    >
                      {/* Service Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ecece0]">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-[#5A5A40]/10 text-[#5A5A40] rounded-lg text-xs font-bold uppercase tracking-wider">
                            #{srvIdx + 1} {srv.dayShort}
                          </span>
                          <input
                            type="text"
                            value={srv.dayTitle}
                            onChange={(e) => handleWeeklyServiceFieldChange(srvIdx, 'dayTitle', e.target.value)}
                            className="p-1.5 border border-transparent hover:border-[#ecece0] focus:border-[#5A5A40] rounded-lg font-serif font-semibold text-stone-800 text-sm focus:bg-[#fcfaf7]"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5 text-xs text-stone-500">
                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                            <input
                              type="date"
                              value={srv.date}
                              onChange={(e) => handleWeeklyServiceFieldChange(srvIdx, 'date', e.target.value)}
                              className="p-1.5 bg-[#fcfaf7] border border-[#ecece0] rounded-lg text-xs font-medium"
                            />
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-stone-500">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <input
                              type="time"
                              value={to24HourTime(srv.time)}
                              onChange={(e) => handleWeeklyServiceFieldChange(srvIdx, 'time', e.target.value)}
                              className="p-1.5 bg-[#fcfaf7] border border-[#ecece0] rounded-lg text-xs font-medium"
                            />
                            {srv.time && (
                              <span className="text-[11px] font-bold text-[#5A5A40] bg-[#5A5A40]/10 px-1.5 py-0.5 rounded">
                                {formatTimeDisplay(srv.time)}
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveServiceFromWeek(srvIdx)}
                            className="p-1.5 text-stone-300 hover:text-red-500 transition"
                            title="Remove this service from package"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Service Roles Fields */}
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {srv.roles.map((r, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-2 bg-[#fcfaf7] p-2.5 rounded-xl border border-[#ecece0]">
                              <input
                                type="text"
                                value={r.role}
                                onChange={(e) => handleWeeklyRoleChange(srvIdx, rIdx, 'role', e.target.value)}
                                placeholder="Role (e.g. Hruaitu)"
                                className="w-28 text-xs font-bold text-[#5A5A40] bg-transparent border-none p-0 focus:ring-0 uppercase tracking-wider"
                              />
                              <input
                                type="text"
                                value={r.value}
                                onChange={(e) => handleWeeklyRoleChange(srvIdx, rIdx, 'value', e.target.value)}
                                placeholder="Person Name / Topic"
                                className="flex-1 text-xs bg-white border border-[#ecece0] rounded-lg p-1.5 focus:outline-none focus:border-[#5A5A40]"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoveRoleFromWeeklyService(srvIdx, rIdx)}
                                className="p-1 text-stone-300 hover:text-red-400"
                                title="Remove field"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add role button & optional notes */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleAddRoleToWeeklyService(srvIdx)}
                            className="text-[#5A5A40] text-[11px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> Add Extra Role/Field
                          </button>
                          
                          <input
                            type="text"
                            value={srv.notes || ''}
                            onChange={(e) => handleWeeklyServiceFieldChange(srvIdx, 'notes', e.target.value)}
                            placeholder="Optional service notes (e.g. Pangpar, Special Item...)"
                            className="text-xs bg-[#fcfaf7] border border-[#ecece0] rounded-lg px-2.5 py-1 text-stone-600 sm:w-80 focus:outline-none focus:border-[#5A5A40]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Weekly Announcements */}
              <div className="bg-white p-5 rounded-2xl border border-[#ecece0] space-y-2">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">
                  Weekly Announcements / Hriattirnate (Optional)
                </label>
                <textarea
                  value={weeklyAnnouncements}
                  onChange={(e) => setWeeklyAnnouncements(e.target.value)}
                  rows={3}
                  placeholder="e.g. Pangpar khawitute: Pi Lalremi te chhung...&#10;Thawhlawm khawntute: Pu Muana & Pu Rama..."
                  className="w-full p-3 bg-[#fcfaf7] border border-[#ecece0] rounded-xl text-xs focus:outline-none focus:border-[#5A5A40]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                type="button"
                onClick={() => setIsWeeklyModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSaveWeeklyPackage}
                className="px-6 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans shadow-xs"
              >
                {editingWeekly ? 'Save Changes' : 'Publish 1-Week Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- MODAL 2: INDIVIDUAL INKHAWM PROGRAMME MODAL --- */}
      {/* ========================================================= */}
      {isInkhawmModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl border border-[#e0e0d5]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white sticky top-0 z-10">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingProgram ? 'Edit Programme' : 'New Programme'}
              </h2>
              <button onClick={() => setIsInkhawmModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6 font-sans">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Service Type</label>
                  <select 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  >
                    {PROGRAM_TITLES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Date</label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={e => setDate(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Time</label>
                    {time && (
                      <span className="text-[11px] font-bold text-[#5A5A40] bg-[#5A5A40]/10 px-1.5 py-0.5 rounded">
                        {formatTimeDisplay(time)}
                      </span>
                    )}
                  </div>
                  <input 
                    type="time" 
                    value={to24HourTime(time)} 
                    onChange={e => setTime(e.target.value)}
                    className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-4">
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest">Activities / Roles</label>
                  <button 
                    onClick={handleAddRole}
                    className="text-[#5A5A40] text-[10px] uppercase font-bold tracking-widest flex items-center hover:underline"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Extra Field
                  </button>
                </div>
                <div className="space-y-3">
                  {roles.map((r, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input 
                          type="text" 
                          value={r.role} 
                          onChange={e => handleRoleChange(i, 'role', e.target.value)}
                          placeholder="Role (e.g. Tantu)"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] font-semibold text-[#5A5A40]"
                        />
                      </div>
                      <div className="flex-[2]">
                        <input 
                          type="text" 
                          value={r.value} 
                          onChange={e => handleRoleChange(i, 'value', e.target.value)}
                          placeholder="Person Name or Topic"
                          className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                        />
                      </div>
                      <button 
                        onClick={() => handleRemoveRole(i)}
                        className="p-3 text-stone-400 hover:text-red-500 bg-white border border-[#ecece0] rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 sticky bottom-0 z-10">
              <button 
                onClick={() => setIsInkhawmModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveInkhawm}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save Programme
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- MODAL 3: TAWNGTAI INKHAWM MODAL --- */}
      {/* ========================================================= */}
      {isTawngtaiModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 flex items-center justify-center p-4">
          <div className="bg-[#f5f5f0] rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-[#e0e0d5]">
            <div className="p-6 border-b border-[#e0e0d5] flex justify-between items-center bg-white shrink-0">
              <h2 className="text-xl font-serif italic text-[#5A5A40]">
                {editingTawngtai ? 'Edit Tawngtai Hruaitu' : 'New Tawngtai Hruaitu Month'}
              </h2>
              <button onClick={() => setIsTawngtaiModalOpen(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 font-sans">
              <div className="w-64">
                <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-2">Month (YYYY-MM)</label>
                <input 
                  type="month" 
                  value={tawngtaiYearMonth} 
                  onChange={e => handleTawngtaiYearMonthChange(e.target.value)}
                  disabled={!!editingTawngtai}
                  className="w-full p-3 bg-white border border-[#ecece0] rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-[#5A5A40] disabled:opacity-50"
                />
              </div>

              <div className="bg-white border border-[#ecece0] rounded-2xl overflow-hidden">
                <table className="min-w-full divide-y divide-[#ecece0]">
                  <thead className="bg-[#fcfaf7] sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest w-[120px]">Date</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Zing Hruaitu</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-stone-400 uppercase tracking-widest">Tlai Hruaitu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ecece0]">
                    {tawngtaiDays.map((day, i) => {
                      const isSunday = day.dayName === 'Pathianni';
                      return (
                        <tr key={i} className={isSunday ? 'bg-stone-50' : ''}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className={`text-sm font-bold ${isSunday ? 'text-[#5A5A40]' : 'text-[#2d2d2a]'}`}>{day.date}</span>
                              <span className={`text-[10px] uppercase tracking-widest ${isSunday ? 'text-[#5A5A40] font-bold' : 'text-stone-400'}`}>{day.dayName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input 
                              type="text"
                              value={day.zingLeader}
                              onChange={e => handleTawngtaiDayChange(i, 'zingLeader', e.target.value)}
                              placeholder={isSunday ? "Pathianni Zing" : "Zing"}
                              className={`w-full p-2 bg-transparent border border-[#ecece0] rounded-lg text-sm focus:outline-none focus:border-[#5A5A40] ${isSunday ? 'font-bold' : ''}`}
                            />
                          </td>
                          <td className="px-4 py-2">
                            {!isSunday ? (
                              <input 
                                type="text"
                                value={day.tlaiLeader}
                                onChange={e => handleTawngtaiDayChange(i, 'tlaiLeader', e.target.value)}
                                placeholder="Tlai"
                                className="w-full p-2 bg-transparent border border-[#ecece0] rounded-lg text-sm focus:outline-none focus:border-[#5A5A40]"
                              />
                            ) : (
                              <div className="text-xs text-stone-400 italic px-2">N/A</div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-[#e0e0d5] bg-white flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsTawngtaiModalOpen(false)}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest text-stone-500 hover:bg-stone-50 font-sans border border-[#ecece0]"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveTawngtai}
                className="px-6 py-2 rounded-xl text-xs uppercase font-bold tracking-widest bg-[#5A5A40] text-white hover:bg-[#4a4a35] font-sans"
              >
                Save {editingTawngtai ? 'Changes' : 'Month'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

// --- DATE HELPER UTILITIES ---

function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split('T')[0];
}

function formatDateRange(startStr: string, endStr: string): string {
  if (!startStr) return '';
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const sDate = new Date(Date.UTC(sy, sm - 1, sd));
  const sMonth = sDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });

  if (!endStr || startStr === endStr) {
    return `${sd} ${sMonth}, ${sy}`;
  }

  const [ey, em, ed] = endStr.split('-').map(Number);
  const eDate = new Date(Date.UTC(ey, em - 1, ed));
  const eMonth = eDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });

  if (sy === ey && sm === em) {
    return `${sd} – ${ed} ${sMonth}, ${sy}`;
  } else if (sy === ey) {
    return `${sd} ${sMonth} – ${ed} ${eMonth}, ${sy}`;
  } else {
    return `${sd} ${sMonth}, ${sy} – ${ed} ${eMonth}, ${ey}`;
  }
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
import { formatTimeDisplay, to24HourTime } from '../lib/utils';

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
  lines.push(`*BETHLEHEM KOHHRAN - TUNKAR KOHHRAN INKHAWM PROGRAMME*`);
  lines.push(`🗓️ ${range} (Nilai Zan – Pathianni Zan)`);
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
      }
    }
  }, [weekParam, weeklyPackages]);

  useEffect(() => {
    if (!editingProgram) {
      setRoles(DEFAULT_PROGRAM_ROLES[title]?.map(r => ({ role: r, value: '' })) || []);
    }
  }, [title, editingProgram]);

  // --- FETCHING DATA ---
  const fetchWeeklyPackages = async () => {
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_weekly_schedules');
      if (local) {
        try {
          const data: WeeklySchedulePackage[] = JSON.parse(local);
          setWeeklyPackages(data);
          if (data.length > 0) {
            setSelectedWeekId(prev => (prev && data.find(p => p.id === prev) ? prev : data[0].id));
          }
        } catch (e) {
          setWeeklyPackages([]);
        }
      }
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, 'programs'), where('isWeeklyPackage', '==', true));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WeeklySchedulePackage));
      
      data.sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
      setWeeklyPackages(data);

      if (data.length > 0) {
        setSelectedWeekId(prev => (prev && data.find(p => p.id === prev) ? prev : data[0].id));
      } else {
        const wed = getNextOrCurrentWednesday();
        const sun = addDaysToDateString(wed, 4);
        const samplePkg: WeeklySchedulePackage = {
          id: 'current_week_programme',
          title: `Tunkar Kohhran Inkhawm Programme (${formatDateRange(wed, sun)})`,
          startDate: wed,
          endDate: sun,
          services: [
            {
              id: 'sample_wed',
              dayShort: 'Nilai Zan',
              dayTitle: 'Nilai Zan (Wednesday Night)',
              date: wed,
              time: '19:00',
              roles: [
                { role: 'Hruaitu', value: 'Upa C. Lalbiakzama' },
                { role: 'Tantu', value: 'Pi Lalremsangi' },
                { role: 'Thupui Hawngtu', value: 'Pu K. Lalmuanpuia' },
                { role: 'Thupui', value: '"Ringtu Nun Kawng"' }
              ]
            },
            {
              id: 'sample_sat',
              dayShort: 'Inrinni Zan',
              dayTitle: 'Inrinni Zan (Saturday Night)',
              date: addDaysToDateString(wed, 3),
              time: '19:00',
              roles: [
                { role: 'Hruaitu', value: 'Upa H. Laltlanthanga' },
                { role: 'Tantu', value: 'Nl. Lalrinawmi' },
                { role: 'Thuhriltu', value: 'Upa R. Vanlalpeka' }
              ]
            },
            {
              id: 'sample_sun_morn',
              dayShort: 'Pathianni Chawhma',
              dayTitle: 'Pathianni Chawhma (Sunday School)',
              date: sun,
              time: '10:00',
              roles: [
                { role: 'Tantu', value: 'Pu David Lalhmingliana' },
                { role: 'Zirlai', value: 'Zirlai 42-na' },
                { role: 'Zirtirtu', value: 'Bialtu Upa' }
              ]
            },
            {
              id: 'sample_sun_aft',
              dayShort: 'Pathianni Chawhnu',
              dayTitle: 'Pathianni Chawhnu (Sunday Afternoon)',
              date: sun,
              time: '13:30',
              roles: [
                { role: 'Tantu', value: 'Pi Zothanpuii' },
                { role: 'Thuhriltu', value: 'Pastor Lalrinmawia' }
              ]
            },
            {
              id: 'sample_sun_night',
              dayShort: 'Pathianni Zan',
              dayTitle: 'Pathianni Zan (Sunday Night)',
              date: sun,
              time: '19:00',
              roles: [
                { role: 'Thuhriltu', value: 'Upa K. Rohmingthanga' },
                { role: 'Hruaitu', value: 'Kohhran Secretary' }
              ]
            }
          ],
          announcements: 'Pangpar khawitute: Pi Lalthanpuii te chhungkua\nThawhlawm khawntute: Pu Lalmuana & Pu Zorema'
        };
        setWeeklyPackages([samplePkg]);
        setSelectedWeekId(samplePkg.id);
      }
    } catch (error) {
      console.error("Error fetching weekly schedules:", error);
      // Fallback to local
      const local = localStorage.getItem('local_weekly_schedules');
      if (local) {
        try {
          setWeeklyPackages(JSON.parse(local));
        } catch (e) {}
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchPrograms = async () => {
    if (!isFirebaseConfigured || !db) {
      const local = localStorage.getItem('local_programs');
      if (local) {
        try {
          setPrograms(JSON.parse(local));
        } catch (e) {}
      }
      return;
    }
    try {
      const q = query(collection(db, 'programs'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs
        .filter(doc => !doc.data().isWeeklyPackage)
        .map(doc => ({ id: doc.id, ...doc.data() } as InkhawmProgramme));
      
      data.sort((a, b) => {
        if (a.date !== b.date) {
           return b.date.localeCompare(a.date);
        }
        return (a.time || '').localeCompare(b.time || '');
      });

      setPrograms(data);
    } catch (error) {
      console.error("Error fetching programs:", error);
      setPrograms([]);
    }
  };

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

  const handleOpenWeeklyModal = (pkg?: WeeklySchedulePackage) => {
    if (pkg) {
      setEditingWeekly(pkg);
      setWeeklyWedDate(pkg.startDate);
      setWeeklyTitle(pkg.title);
      setWeeklyServices(JSON.parse(JSON.stringify(pkg.services)));
      setWeeklyAnnouncements(pkg.announcements || '');
    } else {
      setEditingWeekly(null);
      const wedDate = getNextOrCurrentWednesday();
      const sunDate = addDaysToDateString(wedDate, 4);
      setWeeklyWedDate(wedDate);
      setWeeklyTitle(`Tunkar Kohhran Inkhawm Programme (${formatDateRange(wedDate, sunDate)})`);
      setWeeklyAnnouncements('');

      // Generate standard 5 services from Wednesday to Sunday night
      const generatedServices: WeeklyServiceItem[] = [
        {
          id: 'wed_' + Date.now(),
          dayShort: 'Nilai Zan',
          dayTitle: 'Nilai Zan (Wednesday Night)',
          date: wedDate,
          time: '19:00',
          roles: [
            { role: 'Hruaitu', value: '' },
            { role: 'Tantu', value: '' },
            { role: 'Thupui Hawngtu', value: '' },
            { role: 'Thupui', value: '' }
          ]
        },
        {
          id: 'sat_' + (Date.now() + 1),
          dayShort: 'Inrinni Zan',
          dayTitle: 'Inrinni Zan (Saturday Night)',
          date: addDaysToDateString(wedDate, 3),
          time: '19:00',
          roles: [
            { role: 'Hruaitu', value: '' },
            { role: 'Tantu', value: '' },
            { role: 'Thuhriltu', value: '' }
          ]
        },
        {
          id: 'sun_morn_' + (Date.now() + 2),
          dayShort: 'Pathianni Chawhma',
          dayTitle: 'Pathianni Chawhma (Sunday School)',
          date: sunDate,
          time: '10:00',
          roles: [
            { role: 'Tantu', value: '' },
            { role: 'Zirlai', value: '' },
            { role: 'Zirtirtu', value: '' }
          ]
        },
        {
          id: 'sun_aft_' + (Date.now() + 3),
          dayShort: 'Pathianni Chawhnu',
          dayTitle: 'Pathianni Chawhnu (Sunday Afternoon)',
          date: sunDate,
          time: '13:30',
          roles: [
            { role: 'Tantu', value: '' },
            { role: 'Thuhriltu', value: '' }
          ]
        },
        {
          id: 'sun_night_' + (Date.now() + 4),
          dayShort: 'Pathianni Zan',
          dayTitle: 'Pathianni Zan (Sunday Night)',
          date: sunDate,
          time: '19:00',
          roles: [
            { role: 'Thuhriltu', value: '' },
            { role: 'Hruaitu', value: '' }
          ]
        }
      ];

      setWeeklyServices(generatedServices);
    }
    setIsWeeklyModalOpen(true);
  };

  const handleWeeklyWedDateChange = (newWedDate: string) => {
    setWeeklyWedDate(newWedDate);
    if (!newWedDate) return;

    const sunDate = addDaysToDateString(newWedDate, 4);
    setWeeklyTitle(`Tunkar Kohhran Inkhawm Programme (${formatDateRange(newWedDate, sunDate)})`);

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
      title: weeklyTitle.trim() || `Tunkar Kohhran Inkhawm Programme (${formatDateRange(weeklyWedDate, sunDate)})`,
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
      if (savedId) {
        await updateDoc(doc(db, 'programs', savedId), packagePayload);
      } else {
        const docRef = await addDoc(collection(db, 'programs'), {
          ...packagePayload,
          createdAt: new Date().toISOString()
        });
        savedId = docRef.id;
      }

      setIsWeeklyModalOpen(false);
      await fetchWeeklyPackages();
      if (savedId) {
        setSelectedWeekId(savedId);
      }
    } catch (error: any) {
      console.error("Error saving weekly schedule package:", error);
      alert("Failed to save weekly schedule package. Please try again.");
    }
  };

  const handleDeleteWeeklyPackage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this 1-Week Schedule Package?")) return;

    if (!isFirebaseConfigured || !db) {
      const updated = weeklyPackages.filter(p => p.id !== id);
      localStorage.setItem('local_weekly_schedules', JSON.stringify(updated));
      setWeeklyPackages(updated);
      if (selectedWeekId === id) {
        setSelectedWeekId(updated[0]?.id || '');
      }
      return;
    }

    try {
      await deleteDoc(doc(db, 'programs', id));
      await fetchWeeklyPackages();
      if (selectedWeekId === id) {
        const remaining = weeklyPackages.filter(p => p.id !== id);
        setSelectedWeekId(remaining[0]?.id || '');
      }
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
      setDate(new Date().toISOString().split('T')[0]);
      setTime('10:00');
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
  const currentWeekData = weeklyPackages.find(p => p.id === selectedWeekId) || weeklyPackages[0];

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
            Add Tunkar Inkhawm Programme
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
          Tunkar Kohhran Inkhawm Programme
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
          {/* Week Selector Dropdown & Admin controls */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-[#e0e0d5] shadow-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Calendar className="w-5 h-5 text-[#5A5A40] shrink-0" />
              <div className="flex-1 sm:w-80">
                <label className="block text-[9px] uppercase font-bold text-stone-400 tracking-wider">Select Week Schedule</label>
                <select
                  value={selectedWeekId || currentWeekData?.id || ''}
                  onChange={(e) => setSelectedWeekId(e.target.value)}
                  className="w-full bg-transparent border-none focus:ring-0 text-sm font-bold text-[#5A5A40] uppercase tracking-wider p-0 cursor-pointer"
                >
                  {weeklyPackages.length === 0 ? (
                    <option value="">-- No weekly packages created --</option>
                  ) : (
                    weeklyPackages.map((p, idx) => (
                      <option key={p.id} value={p.id}>
                        {formatDateRange(p.startDate, p.endDate)} {idx === 0 ? '(Current / Latest)' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

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

                      {/* THE ONE-BUTTON SHARE OF 1-WEEK SCHEDULE */}
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

          {/* Active Package Showcase */}
          {currentWeekData ? (
            <div className="bg-white rounded-[32px] border border-[#e0e0d5] overflow-hidden shadow-sm">
              {/* Package Header Banner */}
              <div className="p-6 sm:p-8 bg-gradient-to-b from-[#fcfaf7] to-white border-b border-[#ecece0]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#5A5A40]/10 text-[#5A5A40] rounded-full text-[10px] font-bold uppercase tracking-widest mb-2 font-sans">
                      <Sparkles className="w-3 h-3" />
                      Weekly Church Package • Nilai Zan atanga Pathianni Zan
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-serif text-[#2d2d2a] tracking-tight">
                      {currentWeekData.title}
                    </h2>
                    <p className="mt-1 text-xs text-stone-500 font-sans tracking-wide">
                      🗓️ {formatDateRange(currentWeekData.startDate, currentWeekData.endDate)}
                    </p>
                  </div>

                  {/* Share button banner */}
                  <div className="flex items-center gap-2 shrink-0">
                    {(() => {
                      const shareData = generateWeeklyShareData(currentWeekData);
                      return (
                        <ShareButton
                          title={`Bethlehem Kohhran: ${currentWeekData.title}`}
                          headerTitle="Share 1-Week Schedule"
                          customMessage={shareData.fullText}
                          customSnippet={shareData.snippet}
                          url={`/programs?week=${currentWeekData.id}`}
                          variant="button"
                          buttonText="Share 1-Week Link"
                          className="bg-[#5A5A40] text-white hover:bg-[#4a4a35] hover:text-white"
                        />
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Package Services Grid (Nilai Zan to Pathianni Zan in chronological order) */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {currentWeekData.services.map((srv, index) => {
                    const isSunday = srv.dayShort.toLowerCase().includes('pathianni');
                    const isWednesday = srv.dayShort.toLowerCase().includes('nilai');
                    const isSaturday = srv.dayShort.toLowerCase().includes('inrinni');

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
                          {/* Day badge & time */}
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

                          {/* Service full title */}
                          <h3 className="text-base font-serif font-semibold text-[#2d2d2a] mb-1">
                            {srv.dayTitle}
                          </h3>
                          <p className="text-[11px] text-stone-400 font-sans mb-4">
                            {formatMizoDate(srv.date)}
                          </p>

                          {/* Roles & Activities */}
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

                {/* Weekly Announcements / Hriattirna */}
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
            <div className="text-center py-16 bg-white border border-[#e0e0d5] rounded-3xl p-8 space-y-4">
              <Layers className="w-10 h-10 text-stone-300 mx-auto" />
              <h3 className="text-lg font-serif text-stone-700">No Weekly Schedule Package Available</h3>
              <p className="text-xs text-stone-500 font-sans max-w-md mx-auto">
                Admin can bundle church services from Wednesday (Nilai Zan) to Sunday Night (Pathianni Zan) into a complete package to share in one button.
              </p>
              {isAdmin && (
                <button
                  onClick={() => handleOpenWeeklyModal()}
                  className="bg-[#5A5A40] text-white px-5 py-2.5 rounded-xl text-xs uppercase font-bold tracking-widest hover:bg-[#4a4a35] transition font-sans inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First Weekly Package
                </button>
              )}
            </div>
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
                  Weekly Church Package (Nilai Zan - Pathianni Zan)
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
              {/* Step 1: Week Dates Configuration */}
              <div className="bg-white p-5 rounded-2xl border border-[#ecece0] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-stone-500 tracking-widest mb-1.5">
                    Wednesday (Nilai Zan) Date *
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
                    placeholder="e.g. Tunkar Kohhran Inkhawm Programme (14 - 18 Oct, 2026)"
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

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { InkhawmProgramme, WeeklySchedulePackage, WeeklyServiceItem } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats any time string into 12-hour format with am/pm (e.g. "7:00 pm", "10:00 am")
 */
export function formatTimeDisplay(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // Match 12-hour already formatted (e.g., "7:00 PM", "10:00 AM", "1:30pm")
  const matchAmPm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (matchAmPm) {
    const hh = parseInt(matchAmPm[1], 10);
    const mm = matchAmPm[2];
    const ampm = matchAmPm[3].toLowerCase();
    const h12 = hh % 12 || 12;
    return `${h12}:${mm} ${ampm}`;
  }

  // Match 24-hour format "HH:mm" or "H:mm" or "HH:mm:ss"
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hh = parseInt(match24[1], 10);
    const mm = match24[2];
    const ampm = hh >= 12 ? 'pm' : 'am';
    const h12 = hh % 12 || 12;
    return `${h12}:${mm} ${ampm}`;
  }

  return trimmed;
}

/**
 * Normalizes time string to 24-hour "HH:mm" for HTML <input type="time">
 */
export function to24HourTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  const matchAmPm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (matchAmPm) {
    let hh = parseInt(matchAmPm[1], 10);
    const mm = matchAmPm[2];
    const isPm = matchAmPm[3].toLowerCase() === 'pm';
    if (isPm && hh < 12) hh += 12;
    if (!isPm && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }

  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (match24) {
    const hh = parseInt(match24[1], 10);
    const mm = match24[2];
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }

  return trimmed;
}

/**
 * Calculates date offset by N days in YYYY-MM-DD string format
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().split('T')[0];
}

/**
 * Calculates Wednesday and Sunday of the church week for any given date
 */
export function getWeekRangeForDate(dateStr: string): { wedStr: string; sunStr: string } {
  if (!dateStr) return { wedStr: '', sunStr: '' };
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed, 4 = Thu, 5 = Fri, 6 = Sat
  let diffToWed = 0;
  if (day >= 3) {
    diffToWed = -(day - 3); // Wed=0, Thu=-1, Fri=-2, Sat=-3
  } else if (day === 0) {
    diffToWed = -4; // Sunday belongs to preceding Wednesday (-4 days)
  } else {
    diffToWed = 3 - day; // Mon=+2, Tue=+1
  }
  const wed = new Date(Date.UTC(y, m - 1, d + diffToWed));
  const sun = new Date(Date.UTC(y, m - 1, d + diffToWed + 4));
  return {
    wedStr: wed.toISOString().split('T')[0],
    sunStr: sun.toISOString().split('T')[0]
  };
}

/**
 * Returns the current/active church week range (Wednesday to Sunday).
 * When Monday arrives, it automatically targets the new upcoming Wednesday!
 */
export function getCurrentChurchWeekRange(now: Date = new Date()): { 
  wedStr: string; 
  sunStr: string; 
  isNewWeekStarting: boolean;
  todayStr: string;
} {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayStr = `${y}-${m}-${d}`;
  const range = getWeekRangeForDate(todayStr);
  const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, 3 = Wed
  const isNewWeekStarting = dayOfWeek === 1 || dayOfWeek === 2; // Mon or Tue: new week starts, prep new programme
  return { ...range, isNewWeekStarting, todayStr };
}

/**
 * Generates a clean, blank weekly package template with empty roles ready to be filled by Admin
 */
export function createBlankWeeklyPackageTemplate(wedDate?: string): WeeklySchedulePackage {
  const wedStr = wedDate || getCurrentChurchWeekRange().wedStr;
  const sunStr = addDaysToDateString(wedStr, 4);
  const rangeStr = formatDateRange(wedStr, sunStr);

  const services: WeeklyServiceItem[] = [
    {
      id: 'wed_' + Date.now(),
      dayShort: 'Nilaini Zan',
      dayTitle: 'Nilaini Zan (Wednesday Night)',
      date: wedStr,
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
      date: addDaysToDateString(wedStr, 3),
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
      date: sunStr,
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
      date: sunStr,
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
      date: sunStr,
      time: '19:00',
      roles: [
        { role: 'Thuhriltu', value: '' },
        { role: 'Hruaitu', value: '' }
      ]
    }
  ];

  return {
    id: `week_${wedStr}_${sunStr}`,
    isWeeklyPackage: true,
    title: `Tun Kar Kohhran Inkhawm Programme (${rangeStr})`,
    startDate: wedStr,
    endDate: sunStr,
    services,
    announcements: ''
  };
}

/**
 * Formats a date range e.g. "30 Sep - 4 Oct, 2026" or "19 - 23 Aug, 2026"
 */
export function formatDateRange(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '';
  const [sy, sm, sd] = startStr.split('-').map(Number);
  const [ey, em, ed] = endStr.split('-').map(Number);
  const sDate = new Date(Date.UTC(sy, sm - 1, sd));
  const eDate = new Date(Date.UTC(ey, em - 1, ed));
  
  const sMonth = sDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  const eMonth = eDate.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' });
  
  if (sm === em && sy === ey) {
    return `${sd} - ${ed} ${sMonth}, ${sy}`;
  }
  if (sy === ey) {
    return `${sd} ${sMonth} - ${ed} ${eMonth}, ${sy}`;
  }
  return `${sd} ${sMonth}, ${sy} - ${ed} ${eMonth}, ${ey}`;
}

export function programToWeeklyService(program: InkhawmProgramme): WeeklyServiceItem {
  let dayShort = program.title;
  let dayTitle = program.title;
  const lower = program.title.toLowerCase();

  if (lower.includes('nilai')) {
    dayShort = 'Nilaini Zan';
    dayTitle = 'Nilaini Zan (Wednesday Night)';
  } else if (lower.includes('inrinni')) {
    dayShort = 'Inrinni Zan';
    dayTitle = 'Inrinni Zan (Saturday Night)';
  } else if (lower.includes('chawhma')) {
    dayShort = 'Pathianni Chawhma';
    dayTitle = 'Pathianni Chawhma (Sunday School)';
  } else if (lower.includes('chawhnu')) {
    dayShort = 'Pathianni Chawhnu';
    dayTitle = 'Pathianni Chawhnu (Sunday Afternoon)';
  } else if (lower.includes('zan') && lower.includes('pathianni')) {
    dayShort = 'Pathianni Zan';
    dayTitle = 'Pathianni Zan (Sunday Night)';
  }

  return {
    id: program.id,
    dayShort,
    dayTitle,
    date: program.date,
    time: program.time,
    roles: program.roles || [],
    notes: program.notes || ''
  };
}

export function buildWeeklyPackages(
  rawDocs: any[]
): { 
  packages: WeeklySchedulePackage[]; 
  currentWeekPackage: WeeklySchedulePackage | null;
  archivedPackages: WeeklySchedulePackage[];
  individualPrograms: InkhawmProgramme[];
  currentWeekRange: { wedStr: string; sunStr: string; isNewWeekStarting: boolean };
} {
  const individualPrograms: InkhawmProgramme[] = [];
  const explicitPackages: WeeklySchedulePackage[] = [];

  for (const doc of rawDocs) {
    if (doc.isWeeklyPackage) {
      explicitPackages.push(doc as WeeklySchedulePackage);
    } else {
      individualPrograms.push(doc as InkhawmProgramme);
    }
  }

  // Sort individual programs newest first
  individualPrograms.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return (a.time || '').localeCompare(b.time || '');
  });

  // Group individual programs by week
  const weeksMap = new Map<string, WeeklySchedulePackage>();

  // First add any explicit packages
  for (const pkg of explicitPackages) {
    const key = `${pkg.startDate}_${pkg.endDate}`;
    weeksMap.set(key, pkg);
  }

  // Then group individual programs into weeks
  for (const prog of individualPrograms) {
    if (!prog.date) continue;
    const { wedStr, sunStr } = getWeekRangeForDate(prog.date);
    const key = `${wedStr}_${sunStr}`;
    if (!weeksMap.has(key)) {
      weeksMap.set(key, {
        id: `week_${wedStr}_${sunStr}`,
        title: `Tun Kar Kohhran Inkhawm Programme (${formatDateRange(wedStr, sunStr)})`,
        startDate: wedStr,
        endDate: sunStr,
        services: []
      });
    }
    const pkg = weeksMap.get(key)!;
    if (!pkg.services.some(s => s.id === prog.id)) {
      pkg.services.push(programToWeeklyService(prog));
    }
  }

  const packages = Array.from(weeksMap.values());
  packages.sort((a, b) => b.startDate.localeCompare(a.startDate));

  // Sort services inside each package chronologically (Wednesday to Sunday)
  for (const pkg of packages) {
    pkg.services.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.time || '').localeCompare(b.time || '');
    });
  }

  const currentWeekRange = getCurrentChurchWeekRange();
  
  // Find package for the current active week
  const currentWeekPackage = packages.find(p => p.startDate === currentWeekRange.wedStr) || null;
  
  // Archived packages: packages whose end date is before the current week's Wednesday
  const archivedPackages = packages.filter(p => p.startDate !== currentWeekRange.wedStr);

  return { 
    packages, 
    currentWeekPackage, 
    archivedPackages, 
    individualPrograms,
    currentWeekRange
  };
}



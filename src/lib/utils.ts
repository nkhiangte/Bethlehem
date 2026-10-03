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
): { packages: WeeklySchedulePackage[]; individualPrograms: InkhawmProgramme[] } {
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

  return { packages, individualPrograms };
}



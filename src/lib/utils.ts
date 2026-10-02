import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

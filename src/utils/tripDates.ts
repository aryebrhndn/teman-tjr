export type JapanSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Parses a YYYY-MM-DD string into a local-midnight Date object
 * to avoid UTC timezone off-by-one shifts.
 */
export function parseLocalDate(dateStr?: string | null): Date | null {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) return null;
  const [y, m, d] = dateStr.trim().split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return isNaN(dt.getTime()) ? null : dt;
}

export function getTodayLocal(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

export function formatDateIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDaysToIso(dateStr: string, daysToAdd: number): string {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return '';
  parsed.setDate(parsed.getDate() + daysToAdd);
  return formatDateIso(parsed);
}

/**
 * Detects Japan's 4 seasons based on calendar month:
 * Mar-May: spring | Jun-Aug: summer | Sep-Nov: autumn | Dec-Feb: winter
 */
export function detectJapanSeason(dateStr?: string | null): JapanSeason {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return 'spring';
  const month = parsed.getMonth() + 1; // 1..12
  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'autumn';
  return 'winter';
}

export function getSeasonLabel(season?: string): string {
  switch (season) {
    case 'spring':
      return 'Musim Semi';
    case 'summer':
      return 'Musim Panas';
    case 'autumn':
      return 'Musim Gugur';
    case 'winter':
      return 'Musim Dingin';
    default:
      return 'Semua Musim';
  }
}

export function formatIndonesianDate(dateStr?: string | null, includeYear = true): string {
  const parsed = parseLocalDate(dateStr);
  if (!parsed) return '';
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    ...(includeYear ? { year: 'numeric' } : {}),
  });
}

export interface TripStatusInfo {
  state: 'unset' | 'upcoming' | 'departure_today' | 'ongoing' | 'finished';
  badgeText: string;
  shortBadge: string;
  diffDays: number | null;
  currentDayNumber: number | null;
  formattedRange: string;
  season: JapanSeason;
}

export function getTripStatusInfo(
  departureDateStr?: string | null,
  totalDaysInput = 1,
  fallbackSeason?: JapanSeason
): TripStatusInfo {
  const totalDays = Math.max(1, totalDaysInput);
  const dep = parseLocalDate(departureDateStr);

  if (!dep) {
    return {
      state: 'unset',
      badgeText: 'Tanggal Belum Diatur',
      shortBadge: 'Belum diatur',
      diffDays: null,
      currentDayNumber: null,
      formattedRange: `${totalDays} Hari Perjalanan`,
      season: fallbackSeason || 'spring',
    };
  }

  const today = getTodayLocal();
  const diffDays = Math.round((dep.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const season = detectJapanSeason(departureDateStr);

  // Build formatted date range
  const endDate = new Date(dep);
  endDate.setDate(endDate.getDate() + (totalDays - 1));
  let formattedRange: string;
  if (totalDays <= 1) {
    formattedRange = `${dep.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} • 1 Hari`;
  } else {
    const sameYear = dep.getFullYear() === endDate.getFullYear();
    const startText = dep.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      ...(sameYear ? {} : { year: 'numeric' }),
    });
    const endText = endDate.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    formattedRange = `${startText} – ${endText} • ${totalDays} Hari`;
  }

  if (diffDays > 0) {
    return {
      state: 'upcoming',
      badgeText: diffDays === 1 ? 'Besok Berangkat ke Jepang!' : `H - ${diffDays} Menuju Keberangkatan`,
      shortBadge: diffDays === 1 ? 'Besok berangkat' : `H-${diffDays}`,
      diffDays,
      currentDayNumber: null,
      formattedRange,
      season,
    };
  }

  if (diffDays === 0) {
    return {
      state: 'departure_today',
      badgeText: 'Hari Ini Berangkat · Hari ke-1',
      shortBadge: 'Hari ini berangkat',
      diffDays: 0,
      currentDayNumber: 1,
      formattedRange,
      season,
    };
  }

  const elapsed = Math.abs(diffDays); // days since departure (1 = Day 2)
  if (elapsed < totalDays) {
    const currentDay = elapsed + 1;
    return {
      state: 'ongoing',
      badgeText: `Hari ke-${currentDay} di Jepang`,
      shortBadge: `Hari ke-${currentDay}`,
      diffDays,
      currentDayNumber: currentDay,
      formattedRange,
      season,
    };
  }

  return {
    state: 'finished',
    badgeText: 'Perjalanan Selesai',
    shortBadge: 'Selesai',
    diffDays,
    currentDayNumber: null,
    formattedRange,
    season,
  };
}

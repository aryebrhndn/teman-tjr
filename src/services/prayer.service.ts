import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface JapanCity {
  id: string;
  name: string;
  label: string;
  sublabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  defaultQiblaAngle: number;
}

export const JAPAN_CITIES: Record<string, JapanCity> = {
  tokyo: {
    id: 'tokyo',
    name: 'Tokyo',
    label: 'Tokyo (Tokyo Tower & Shinjuku)',
    sublabel: 'Shinjuku, Shibuya, Asakusa',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 293,
  },
  osaka: {
    id: 'osaka',
    name: 'Osaka',
    label: 'Osaka (Namba & Umeda)',
    sublabel: 'Dotonbori, Umeda, Chibune',
    latitude: 34.6937,
    longitude: 135.5023,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 291,
  },
  kyoto: {
    id: 'kyoto',
    name: 'Kyoto',
    label: 'Kyoto (Gion & Arashiyama)',
    sublabel: 'Fushimi Inari, Gion, Kamigyo',
    latitude: 35.0116,
    longitude: 135.7681,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 291,
  },
  sapporo: {
    id: 'sapporo',
    name: 'Sapporo',
    label: 'Sapporo (Hokkaido Area)',
    sublabel: 'Odori Park, Susukino',
    latitude: 43.0618,
    longitude: 141.3545,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 288,
  },
  fukuoka: {
    id: 'fukuoka',
    name: 'Fukuoka',
    label: 'Fukuoka (Hakata Area)',
    sublabel: 'Hakata, Tenjin',
    latitude: 33.5904,
    longitude: 130.4017,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 290,
  },
};

export interface DailyPrayers {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  nextPrayer: {
    name: string;
    time: string;
    remainingSeconds: number;
  };
  qiblaAngle: number;
}

export function calculateQibla(latitude: number, longitude: number): number {
  const kaabaLat = (21.4225 * Math.PI) / 180;
  const kaabaLng = (39.8262 * Math.PI) / 180;
  const userLat = (latitude * Math.PI) / 180;
  const userLng = (longitude * Math.PI) / 180;

  const y = Math.sin(kaabaLng - userLng);
  const x = Math.cos(userLat) * Math.tan(kaabaLat) - Math.sin(userLat) * Math.cos(kaabaLng - userLng);
  let qibla = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((qibla + 360) % 360);
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getJapanPrayerTimes(cityKey = 'tokyo', date = new Date()): DailyPrayers {
  const city = JAPAN_CITIES[cityKey] || JAPAN_CITIES.tokyo;
  const coordinates = new Coordinates(city.latitude, city.longitude);

  const params = CalculationMethod.MuslimWorldLeague();
  params.madhab = Madhab.Shafi;

  const prayerTimes = new PrayerTimes(coordinates, date, params);

  const now = new Date();
  const nextPrayerName = prayerTimes.nextPrayer(now);

  let nextName = 'Subuh';
  let nextDate = prayerTimes.fajr;

  switch (nextPrayerName) {
    case 'fajr':
      nextName = 'Subuh';
      nextDate = prayerTimes.fajr;
      break;
    case 'sunrise':
    case 'dhuhr':
      nextName = 'Dzuhur';
      nextDate = prayerTimes.dhuhr;
      break;
    case 'asr':
      nextName = 'Ashar';
      nextDate = prayerTimes.asr;
      break;
    case 'maghrib':
      nextName = 'Maghrib';
      nextDate = prayerTimes.maghrib;
      break;
    case 'isha':
      nextName = 'Isya';
      nextDate = prayerTimes.isha;
      break;
    default:
      // Past Isha: next is tomorrow's Fajr
      nextName = 'Subuh (Besok)';
      const tomorrow = new Date(date);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowTimes = new PrayerTimes(coordinates, tomorrow, params);
      nextDate = tomorrowTimes.fajr;
      break;
  }

  const diffMs = nextDate.getTime() - now.getTime();
  const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));

  return {
    fajr: formatTime(prayerTimes.fajr),
    sunrise: formatTime(prayerTimes.sunrise),
    dhuhr: formatTime(prayerTimes.dhuhr),
    asr: formatTime(prayerTimes.asr),
    maghrib: formatTime(prayerTimes.maghrib),
    isha: formatTime(prayerTimes.isha),
    nextPrayer: {
      name: nextName,
      time: formatTime(nextDate),
      remainingSeconds,
    },
    qiblaAngle: calculateQibla(city.latitude, city.longitude),
  };
}

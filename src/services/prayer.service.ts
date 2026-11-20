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
    defaultQiblaAngle: 293.0,
  },
  osaka: {
    id: 'osaka',
    name: 'Osaka',
    label: 'Osaka (Namba & Umeda)',
    sublabel: 'Dotonbori, Umeda, Chibune',
    latitude: 34.6937,
    longitude: 135.5023,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 290.8,
  },
  kyoto: {
    id: 'kyoto',
    name: 'Kyoto',
    label: 'Kyoto (Gion & Arashiyama)',
    sublabel: 'Fushimi Inari, Gion, Kamigyo',
    latitude: 35.0116,
    longitude: 135.7681,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 290.9,
  },
  fuji: {
    id: 'fuji',
    name: 'Fuji / Kawaguchiko',
    label: 'Gunung Fuji (Kawaguchiko & Yamanashi)',
    sublabel: 'Lake Kawaguchi, Chureito, Fujiyoshida',
    latitude: 35.4975,
    longitude: 138.7554,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 292.5,
  },
  nagoya: {
    id: 'nagoya',
    name: 'Nagoya',
    label: 'Nagoya (Aichi Area)',
    sublabel: 'Sakae, Meieki, Osu',
    latitude: 35.1815,
    longitude: 136.9066,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 291.6,
  },
  yokohama: {
    id: 'yokohama',
    name: 'Yokohama',
    label: 'Yokohama (Kanagawa Area)',
    sublabel: 'Minato Mirai, Chinatown',
    latitude: 35.4437,
    longitude: 139.6380,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 293.0,
  },
  hiroshima: {
    id: 'hiroshima',
    name: 'Hiroshima',
    label: 'Hiroshima (Peace Park & Miyajima)',
    sublabel: 'Genbaku Dome, Itsukushima',
    latitude: 34.3853,
    longitude: 132.4553,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 289.3,
  },
  fukuoka: {
    id: 'fukuoka',
    name: 'Fukuoka',
    label: 'Fukuoka (Hakata Area)',
    sublabel: 'Hakata, Tenjin, Dazaifu',
    latitude: 33.5904,
    longitude: 130.4017,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 288.4,
  },
  sapporo: {
    id: 'sapporo',
    name: 'Sapporo',
    label: 'Sapporo (Hokkaido Area)',
    sublabel: 'Odori Park, Susukino, Otaru',
    latitude: 43.0618,
    longitude: 141.3545,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 293.4,
  },
  takayama: {
    id: 'takayama',
    name: 'Takayama & Shirakawa-go',
    label: 'Takayama (Gifu Area)',
    sublabel: 'Sanmachi Suji, Shirakawa-go',
    latitude: 36.1460,
    longitude: 137.2520,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 292.0,
  },
  sendai: {
    id: 'sendai',
    name: 'Sendai',
    label: 'Sendai (Tohoku Area)',
    sublabel: 'Aoba, Matsushima',
    latitude: 38.2682,
    longitude: 140.8694,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 294.6,
  },
  okinawa: {
    id: 'okinawa',
    name: 'Okinawa / Naha',
    label: 'Okinawa (Naha Area)',
    sublabel: 'Kokusai Dori, Shuri',
    latitude: 26.2124,
    longitude: 127.6809,
    timezone: 'Asia/Tokyo',
    defaultQiblaAngle: 288.6,
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
  const kaabaLat = (21.422487 * Math.PI) / 180;
  const kaabaLng = (39.826206 * Math.PI) / 180;
  const userLat = (latitude * Math.PI) / 180;
  const userLng = (longitude * Math.PI) / 180;

  const y = Math.sin(kaabaLng - userLng);
  const x = Math.cos(userLat) * Math.tan(kaabaLat) - Math.sin(userLat) * Math.cos(kaabaLng - userLng);
  const qibla = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round(((qibla + 360) % 360) * 10) / 10;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function getJapanPrayerTimes(
  locationInput: string | { latitude: number; longitude: number } = 'tokyo',
  date = new Date()
): DailyPrayers {
  let lat = 35.6762;
  let lng = 139.6503;

  if (typeof locationInput === 'string') {
    const city = JAPAN_CITIES[locationInput] || JAPAN_CITIES.tokyo;
    lat = city.latitude;
    lng = city.longitude;
  } else if (locationInput && typeof locationInput.latitude === 'number') {
    lat = locationInput.latitude;
    lng = locationInput.longitude;
  }

  const coordinates = new Coordinates(lat, lng);

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
    qiblaAngle: calculateQibla(lat, lng),
  };
}

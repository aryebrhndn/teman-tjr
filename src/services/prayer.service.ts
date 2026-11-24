import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface JapanCity {
  id: string;
  name: string;
  label: string;
  sublabel: string;
  latitude: number;
  longitude: number;
  timezone: string;
  defaultQiblaAngle?: number;
}

const RAW_JAPAN_CITIES: Array<{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}> = [
  // Hokkaido & Tohoku
  { id: 'sapporo', name: 'Sapporo, Hokkaido', latitude: 43.0618, longitude: 141.3545 },
  { id: 'hakodate', name: 'Hakodate, Hokkaido', latitude: 41.7687, longitude: 140.7288 },
  { id: 'otaru', name: 'Otaru, Hokkaido', latitude: 43.1907, longitude: 140.9947 },
  { id: 'furano', name: 'Furano, Hokkaido', latitude: 43.3421, longitude: 142.3832 },
  { id: 'new_chitose', name: 'New Chitose Airport', latitude: 42.7752, longitude: 141.6923 },
  { id: 'aomori', name: 'Aomori', latitude: 40.8246, longitude: 140.7400 },
  { id: 'morioka', name: 'Morioka, Iwate', latitude: 39.7020, longitude: 141.1545 },
  { id: 'sendai', name: 'Sendai, Miyagi', latitude: 38.2682, longitude: 140.8694 },
  { id: 'akita', name: 'Akita', latitude: 39.7200, longitude: 140.1025 },
  { id: 'yamagata', name: 'Yamagata', latitude: 38.2554, longitude: 140.3396 },
  { id: 'fukushima', name: 'Fukushima', latitude: 37.7608, longitude: 140.4747 },

  // Kanto
  { id: 'mito', name: 'Mito, Ibaraki', latitude: 36.3659, longitude: 140.4712 },
  { id: 'utsunomiya', name: 'Utsunomiya, Tochigi', latitude: 36.5551, longitude: 139.8828 },
  { id: 'nikko', name: 'Nikko, Tochigi', latitude: 36.7199, longitude: 139.6982 },
  { id: 'maebashi', name: 'Maebashi, Gunma', latitude: 36.3895, longitude: 139.0634 },
  { id: 'kusatsu', name: 'Kusatsu Onsen, Gunma', latitude: 36.6207, longitude: 138.5961 },
  { id: 'saitama', name: 'Saitama', latitude: 35.8617, longitude: 139.6455 },
  { id: 'chiba', name: 'Chiba', latitude: 35.6074, longitude: 140.1065 },
  { id: 'narita', name: 'Narita Airport', latitude: 35.7720, longitude: 140.3929 },
  { id: 'tokyo', name: 'Tokyo (Shinjuku)', latitude: 35.6895, longitude: 139.6917 },
  { id: 'tokyo_asakusa', name: 'Tokyo (Asakusa)', latitude: 35.7148, longitude: 139.7967 },
  { id: 'tokyo_shibuya', name: 'Tokyo (Shibuya)', latitude: 35.6580, longitude: 139.7016 },
  { id: 'haneda', name: 'Haneda Airport', latitude: 35.5494, longitude: 139.7798 },
  { id: 'yokohama', name: 'Yokohama, Kanagawa', latitude: 35.4437, longitude: 139.6380 },
  { id: 'kamakura', name: 'Kamakura, Kanagawa', latitude: 35.3192, longitude: 139.5467 },
  { id: 'hakone', name: 'Hakone, Kanagawa', latitude: 35.2324, longitude: 139.1069 },

  // Chubu
  { id: 'fujikawaguchiko', name: 'Fujikawaguchiko, Yamanashi', latitude: 35.5028, longitude: 138.7652 },
  { id: 'kofu', name: 'Kofu, Yamanashi', latitude: 35.6621, longitude: 138.5683 },
  { id: 'niigata', name: 'Niigata', latitude: 37.9162, longitude: 139.0364 },
  { id: 'toyama', name: 'Toyama', latitude: 36.6959, longitude: 137.2137 },
  { id: 'kanazawa', name: 'Kanazawa, Ishikawa', latitude: 36.5613, longitude: 136.6562 },
  { id: 'fukui', name: 'Fukui', latitude: 36.0641, longitude: 136.2195 },
  { id: 'nagano', name: 'Nagano', latitude: 36.6485, longitude: 138.1942 },
  { id: 'matsumoto', name: 'Matsumoto, Nagano', latitude: 36.2380, longitude: 137.9720 },
  { id: 'takayama', name: 'Takayama, Gifu', latitude: 36.1460, longitude: 137.2520 },
  { id: 'shirakawago', name: 'Shirakawa-go, Gifu', latitude: 36.2562, longitude: 136.9065 },
  { id: 'gifu', name: 'Gifu', latitude: 35.4233, longitude: 136.7607 },
  { id: 'shizuoka', name: 'Shizuoka', latitude: 34.9756, longitude: 138.3828 },
  { id: 'hamamatsu', name: 'Hamamatsu, Shizuoka', latitude: 34.7108, longitude: 137.7261 },
  { id: 'nagoya', name: 'Nagoya, Aichi', latitude: 35.1815, longitude: 136.9066 },
  { id: 'centrair', name: 'Chubu Centrair Airport', latitude: 34.8584, longitude: 136.8125 },
  { id: 'tsu', name: 'Tsu, Mie', latitude: 34.7186, longitude: 136.5057 },

  // Kansai
  { id: 'otsu', name: 'Otsu, Shiga', latitude: 35.0179, longitude: 135.8549 },
  { id: 'kyoto', name: 'Kyoto', latitude: 35.0116, longitude: 135.7681 },
  { id: 'osaka', name: 'Osaka (Namba)', latitude: 34.6660, longitude: 135.5013 },
  { id: 'osaka_umeda', name: 'Osaka (Umeda)', latitude: 34.7025, longitude: 135.4959 },
  { id: 'kansai_airport', name: 'Kansai Airport', latitude: 34.4320, longitude: 135.2304 },
  { id: 'kobe', name: 'Kobe, Hyogo', latitude: 34.6901, longitude: 135.1955 },
  { id: 'himeji', name: 'Himeji, Hyogo', latitude: 34.8151, longitude: 134.6853 },
  { id: 'nara', name: 'Nara', latitude: 34.6851, longitude: 135.8048 },
  { id: 'wakayama', name: 'Wakayama', latitude: 34.2305, longitude: 135.1708 },

  // Chugoku & Shikoku
  { id: 'tottori', name: 'Tottori', latitude: 35.5011, longitude: 134.2351 },
  { id: 'matsue', name: 'Matsue, Shimane', latitude: 35.4681, longitude: 133.0484 },
  { id: 'okayama', name: 'Okayama', latitude: 34.6551, longitude: 133.9195 },
  { id: 'kurashiki', name: 'Kurashiki, Okayama', latitude: 34.5850, longitude: 133.7720 },
  { id: 'hiroshima', name: 'Hiroshima', latitude: 34.3853, longitude: 132.4553 },
  { id: 'miyajima', name: 'Miyajima, Hiroshima', latitude: 34.2960, longitude: 132.3198 },
  { id: 'yamaguchi', name: 'Yamaguchi', latitude: 34.1785, longitude: 131.4737 },
  { id: 'tokushima', name: 'Tokushima', latitude: 34.0703, longitude: 134.5548 },
  { id: 'takamatsu', name: 'Takamatsu, Kagawa', latitude: 34.3428, longitude: 134.0466 },
  { id: 'matsuyama', name: 'Matsuyama, Ehime', latitude: 33.8392, longitude: 132.7657 },
  { id: 'kochi', name: 'Kochi', latitude: 33.5597, longitude: 133.5311 },

  // Kyushu & Okinawa
  { id: 'fukuoka', name: 'Fukuoka', latitude: 33.5904, longitude: 130.4017 },
  { id: 'fukuoka_airport', name: 'Fukuoka Airport', latitude: 33.5859, longitude: 130.4509 },
  { id: 'kitakyushu', name: 'Kitakyushu, Fukuoka', latitude: 33.8834, longitude: 130.8752 },
  { id: 'saga', name: 'Saga', latitude: 33.2635, longitude: 130.3009 },
  { id: 'nagasaki', name: 'Nagasaki', latitude: 32.7503, longitude: 129.8777 },
  { id: 'kumamoto', name: 'Kumamoto', latitude: 32.8032, longitude: 130.7079 },
  { id: 'oita', name: 'Oita', latitude: 33.2382, longitude: 131.6126 },
  { id: 'beppu', name: 'Beppu, Oita', latitude: 33.2846, longitude: 131.4912 },
  { id: 'miyazaki', name: 'Miyazaki', latitude: 31.9077, longitude: 131.4202 },
  { id: 'kagoshima', name: 'Kagoshima', latitude: 31.5966, longitude: 130.5571 },
  { id: 'okinawa', name: 'Naha, Okinawa', latitude: 26.2124, longitude: 127.6809 },
  { id: 'ishigaki', name: 'Ishigaki, Okinawa', latitude: 24.3407, longitude: 124.1556 },
];

export const JAPAN_CITY_LIST: JapanCity[] = RAW_JAPAN_CITIES.map((c) => ({
  ...c,
  label: c.name,
  sublabel: '',
  timezone: 'Asia/Tokyo',
}));

export const JAPAN_CITIES: Record<string, JapanCity> = Object.fromEntries(
  JAPAN_CITY_LIST.map((c) => [c.id, c])
);

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

/**
 * Haversine distance in kilometers between two GPS coordinates.
 */
export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
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
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === 'hour')?.value || '00';
  const minute = parts.find((p) => p.type === 'minute')?.value || '00';
  return `${hour}:${minute}`;
}

export function getJapanPrayerTimes(
  locationInput: string | { latitude: number; longitude: number } = 'tokyo',
  date = new Date(),
  method: 'MuslimWorldLeague' | 'Egyptian' | 'Karachi' | 'UmmAlQura' = 'MuslimWorldLeague',
  madhab: 'Shafi' | 'Hanafi' = 'Shafi'
): DailyPrayers {
  let lat = 35.6895;
  let lng = 139.6917;

  if (typeof locationInput === 'string') {
    const city = JAPAN_CITIES[locationInput] || JAPAN_CITIES.tokyo;
    lat = city.latitude;
    lng = city.longitude;
  } else if (locationInput && typeof locationInput.latitude === 'number') {
    lat = locationInput.latitude;
    lng = locationInput.longitude;
  }

  const coordinates = new Coordinates(lat, lng);

  let params = CalculationMethod.MuslimWorldLeague();
  if (method === 'Egyptian') params = CalculationMethod.Egyptian();
  else if (method === 'Karachi') params = CalculationMethod.Karachi();
  else if (method === 'UmmAlQura') params = CalculationMethod.UmmAlQura();

  params.madhab = madhab === 'Hanafi' ? Madhab.Hanafi : Madhab.Shafi;

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

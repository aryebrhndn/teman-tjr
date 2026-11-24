import { db } from './dexie';
import { JAPAN_PRAYER_PLACES } from '../data/japanPrayerPlaces';
import {
  ALL_DEFAULT_CHECKLIST,
  DEFAULT_PACKING_ITEMS,
  DEFAULT_PACKING_SUBLISTS,
} from '../data/bekalDefaults';

export const MAIN_TRIP_ID = 'trip-main';

export async function initializeDatabaseSeed() {
  const migrated = await db.local_meta.get('hitori_v2_migrated');
  const tripCount = await db.trips.count();

  // One-time migration from legacy 7-day 2025 Open/Private Trip template to clean Hitori-style single-day start
  if (!migrated) {
    // 1. Clean legacy trips & itinerary days/items if they exist from old template
    if (tripCount > 0) {
      await db.trips.clear();
      await db.itinerary_days.clear();
      await db.itinerary_items.clear();
    }

    // Create 1 clean customizable trip (departure_date empty until user sets it in Bekal)
    await db.trips.put({
      id: MAIN_TRIP_ID,
      name: 'Perjalanan Jepang Saya',
      destination: 'Jepang',
      departure_date: '',
      return_date: '',
      season: 'spring',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Start with ONLY 1 customizable day (user can edit nama, kota/kemana, tanggal, & tambah hari selanjutnya)
    await db.itinerary_days.put({
      id: 'day-1',
      trip_id: MAIN_TRIP_ID,
      date: '',
      day_number: 1,
      title: 'Hari Pertama di Jepang',
      city: 'Tokyo',
      notes: '',
      status: 'Dalam Rencana',
    });

    // 2. Preserve any custom checklist items, replace legacy default checklist with Hitori-style timeline + seasonal packing
    const existingCustom = await db.checklist_items.filter((c) => c.is_custom === true).toArray();
    await db.checklist_items.clear();
    for (const item of ALL_DEFAULT_CHECKLIST) {
      await db.checklist_items.put(item);
    }
    for (const custom of existingCustom) {
      await db.checklist_items.put({
        ...custom,
        section: custom.section || 'packing',
        season: custom.season || 'all',
      });
    }

    // 3. Ensure budget exists
    const budgetCount = await db.budgets.count();
    if (budgetCount === 0) {
      await db.budgets.put({
        id: 'budget-main',
        trip_id: MAIN_TRIP_ID,
        name: 'Anggaran Liburan Jepang',
        amount: 25000000,
        currency: 'IDR',
        created_at: new Date().toISOString(),
      });
    }

    // 4. Ensure prayer places exist
    const ppCount = await db.prayer_places.count();
    if (ppCount < JAPAN_PRAYER_PLACES.length) {
      for (const pp of JAPAN_PRAYER_PLACES) {
        await db.prayer_places.put(pp);
      }
    }

    // 5. Ensure default settings exist
    const existingRate = await db.app_settings.get('exchange_rate');
    if (!existingRate) {
      await db.app_settings.put({
        key: 'exchange_rate',
        value: 114.14,
        updated_at: new Date().toISOString(),
      });
    }

    const existingPrayer = await db.app_settings.get('prayer_settings');
    if (!existingPrayer) {
      await db.app_settings.put({
        key: 'prayer_settings',
        value: {
          selected_city: 'tokyo',
          calculation_method: 'MuslimWorldLeague',
          madhhab: 'Shafi',
          latitude: 35.6762,
          longitude: 139.6503,
          timezone: 'Asia/Tokyo',
        },
        updated_at: new Date().toISOString(),
      });
    }

    await db.app_settings.put({
      key: 'packing_sublists',
      value: DEFAULT_PACKING_SUBLISTS,
      updated_at: new Date().toISOString(),
    });

    await db.local_meta.put({ key: 'hitori_v2_migrated', value: true });
    await db.local_meta.put({ key: 'hitori_v3_packing_sublists', value: true });
    return;
  }

  // One-time v3 migration: upgrade flat packing list to Hitori structured sub-lists & sync expanded prayer places
  const migratedV3 = await db.local_meta.get('hitori_v3_packing_sublists');
  if (!migratedV3) {
    // Keep all timeline items + user custom packing items, replace default flat packing items with Hitori sub-lists
    const allExisting = await db.checklist_items.toArray();
    const keepTimeline = allExisting.filter(
      (i) => i.section === 'timeline' || typeof i.days_before_departure === 'number'
    );
    const keepCustomPacking = allExisting.filter(
      (i) => i.section === 'packing' && i.is_custom === true
    );

    await db.checklist_items.clear();
    for (const item of keepTimeline) {
      await db.checklist_items.put(item);
    }
    for (const item of DEFAULT_PACKING_ITEMS) {
      await db.checklist_items.put(item);
    }
    for (const custom of keepCustomPacking) {
      await db.checklist_items.put({
        ...custom,
        group: custom.group || 'Lain-lain',
        season: custom.season || 'all',
      });
    }

    await db.app_settings.put({
      key: 'packing_sublists',
      value: DEFAULT_PACKING_SUBLISTS,
      updated_at: new Date().toISOString(),
    });

    // Also refresh Japan prayer places with the expanded 74-city directory
    for (const pp of JAPAN_PRAYER_PLACES) {
      await db.prayer_places.put(pp);
    }

    await db.local_meta.put({ key: 'hitori_v3_packing_sublists', value: true });
  }

  // Safety check: ensure at least 1 trip exists
  if (tripCount === 0) {
    await db.trips.put({
      id: MAIN_TRIP_ID,
      name: 'Perjalanan Jepang Saya',
      destination: 'Jepang',
      departure_date: '',
      return_date: '',
      season: 'spring',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
}

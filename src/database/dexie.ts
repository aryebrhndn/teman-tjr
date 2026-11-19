import Dexie, { type Table } from 'dexie';

export interface Trip {
  id: string;
  name: string;
  destination: string;
  departure_date: string;
  return_date: string;
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  travelers_count?: number;
  flight_number?: string;
  created_at: string;
  updated_at: string;
}

export interface ItineraryDay {
  id: string;
  trip_id: string;
  date: string;
  day_number: number;
  title?: string;
  city?: string;
  theme?: string;
  notes?: string;
}

export interface ItineraryItem {
  id: string;
  day_id: string;
  title: string;
  start_time?: string;
  end_time?: string;
  location?: string;
  address?: string;
  notes?: string;
  estimated_cost?: number;
  currency?: string;
  completed: boolean;
  sort_order: number;
  is_halal_spot?: boolean;
}

export interface Budget {
  id: string;
  trip_id: string;
  name: string;
  amount: number; // in IDR
  currency: string;
  created_at: string;
}

export interface Expense {
  id: string;
  budget_id: string;
  name: string;
  category: 'Food' | 'Transportation' | 'Accommodation' | 'Shopping' | 'Attraction' | 'Other';
  original_amount: number;
  original_currency: 'JPY' | 'IDR';
  exchange_rate: number; // Snapshot of exchange rate at transaction time
  converted_idr: number;
  expense_date: string;
  notes?: string;
  location_name?: string;
}

export interface ChecklistItem {
  id: string;
  category: 'Documents' | 'Electronics' | 'Clothing' | 'Personal Care' | 'Medication' | 'Travel Accessories' | 'Worship Equipment';
  title: string;
  completed: boolean;
  due_date?: string;
  days_before_departure?: number;
  is_priority?: boolean;
  sort_order: number;
  is_custom: boolean;
  season?: 'spring' | 'summer' | 'autumn' | 'winter';
}

export interface AppSetting {
  key: string;
  value: any;
  updated_at: string;
}

export interface PrayerPlace {
  id: string;
  name: string;
  type: 'Mosque' | 'Prayer Room';
  description: string;
  address: string;
  city: string;
  prefecture: string;
  latitude: number;
  longitude: number;
  distance_km?: number;
  facilities: string[];
  website?: string;
  open_hours?: string;
  verification_date: string;
  status: 'Published' | 'Draft';
  image_url?: string;
}

export interface CachedContent {
  content_type: string;
  content_id: string;
  payload: any;
  content_version: number;
  cached_at: string;
}

export interface LocalMeta {
  key: string;
  value: any;
}

export class TJRDatabase extends Dexie {
  trips!: Table<Trip>;
  itinerary_days!: Table<ItineraryDay>;
  itinerary_items!: Table<ItineraryItem>;
  budgets!: Table<Budget>;
  expenses!: Table<Expense>;
  checklist_items!: Table<ChecklistItem>;
  app_settings!: Table<AppSetting>;
  prayer_places!: Table<PrayerPlace>;
  cached_content!: Table<CachedContent>;
  local_meta!: Table<LocalMeta>;

  constructor() {
    super('teman_jalan_ryan_db');
    this.version(1).stores({
      trips: 'id, departure_date',
      itinerary_days: 'id, trip_id, day_number, date',
      itinerary_items: 'id, day_id, sort_order, completed',
      budgets: 'id, trip_id',
      expenses: 'id, budget_id, category, expense_date',
      checklist_items: 'id, category, completed, days_before_departure, sort_order',
      app_settings: 'key',
      prayer_places: 'id, city, type, status',
      cached_content: 'content_type, content_id',
      local_meta: 'key',
    });
  }
}

export const db = new TJRDatabase();

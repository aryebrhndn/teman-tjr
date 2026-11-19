import { db } from '../database/dexie';
import { supabase, isSupabaseConfigured } from './supabase.client';

export interface ActivationReceipt {
  code: string;
  deviceId: string;
  token: string;
  activatedAt: string;
  customerName?: string;
  tripName?: string;
  status: 'active' | 'revoked';
}

const LOCAL_STORAGE_DEVICE_KEY = 'tjr_device_id';

export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(LOCAL_STORAGE_DEVICE_KEY);
  if (!deviceId) {
    deviceId = 'dev_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now().toString(36);
    localStorage.setItem(LOCAL_STORAGE_DEVICE_KEY, deviceId);
  }
  return deviceId;
}

export async function checkActivationStatus(): Promise<ActivationReceipt | null> {
  const meta = await db.local_meta.get('activation_receipt');
  if (meta && meta.value && meta.value.status === 'active') {
    return meta.value as ActivationReceipt;
  }
  return null;
}

export async function activateDevice(code: string): Promise<{ success: boolean; message: string; receipt?: ActivationReceipt }> {
  const cleaned = code.trim().toUpperCase();

  // Validate format (e.g. starts with TJR- or standard demo codes)
  if (!cleaned.startsWith('TJR-') && cleaned !== 'TEMANJALAN2025') {
    return {
      success: false,
      message: "Format kode tidak valid. Pastikan awalan 'TJR-' (Contoh: TJR-JPN-2025-XXXX)",
    };
  }

  const deviceId = getOrCreateDeviceId();
  let customerName = 'Ary Muhtadie';
  const tripName = 'Jelajah Tokyo, Kyoto & Osaka 2025';

  // 1. If Supabase is connected and online, validate with Cloud DB
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('activation_codes')
        .select('*')
        .eq('code_display', cleaned)
        .maybeSingle();

      if (!error && data) {
        if (data.status === 'redeemed' && data.device_id_hash && data.device_id_hash !== deviceId) {
          return {
            success: false,
            message: 'Kode tiket ini sudah aktif digunakan pada perangkat lain.',
          };
        }
        if (data.status === 'revoked' || data.status === 'expired') {
          return {
            success: false,
            message: 'Kode tiket ini sudah kedaluwarsa atau dibatalkan oleh admin.',
          };
        }

        // Mark as redeemed in Supabase
        await supabase
          .from('activation_codes')
          .update({
            status: 'redeemed',
            redeemed_at: new Date().toISOString(),
            device_id_hash: deviceId,
          })
          .eq('id', data.id);

        if (data.customer_name) customerName = data.customer_name;
      }
    } catch {
      // Graceful offline fallback: if network is down or table not created yet, proceed with local verification
    }
  }

  // 2. Save local entitlement receipt into IndexedDB for 100% offline access
  const receipt: ActivationReceipt = {
    code: cleaned,
    deviceId,
    token: 'entitlement_tok_' + Math.random().toString(36).substring(2) + '_' + Date.now(),
    activatedAt: new Date().toISOString(),
    customerName,
    tripName,
    status: 'active',
  };

  await db.local_meta.put({
    key: 'activation_receipt',
    value: receipt,
  });

  return {
    success: true,
    message: 'Trip terverifikasi! Memuat itinerary offline Anda...',
    receipt,
  };
}

export async function deactivateDevice(): Promise<void> {
  await db.local_meta.delete('activation_receipt');
}

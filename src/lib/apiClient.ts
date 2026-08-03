import { VehicleRecord, Mechanic, Announcement, ActivityLog } from '../types';

export interface AppStateData {
  vehicles: VehicleRecord[];
  mechanics: Mechanic[];
  announcements: Announcement[];
  activityLogs: ActivityLog[];
}

const LOCAL_STORAGE_KEY = 'workshop_display_data_v1';
const BROADCAST_CHANNEL_NAME = 'workshop_display_channel';

// Create cross-tab BroadcastChannel
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  } catch (e) {
    console.warn('BroadcastChannel not supported:', e);
  }
}

export function saveLocalFallbackState(data: AppStateData) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save state to localStorage:', e);
  }
}

export function getLocalFallbackState(): AppStateData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to read state from localStorage:', e);
  }
  return null;
}

export const apiClient = {
  async fetchAllData(): Promise<AppStateData> {
    try {
      const res = await fetch('/api/vehicles');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      saveLocalFallbackState(data);
      return data;
    } catch (err) {
      console.warn('Backend API fetch failed, loading local storage cache:', err);
      const fallback = getLocalFallbackState();
      if (fallback) return fallback;
      throw err;
    }
  },

  async addVehicle(payload: Partial<VehicleRecord>): Promise<{ vehicle: VehicleRecord; log: ActivityLog }> {
    try {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to add vehicle');
      }
      const data = await res.json();
      this.broadcastLocalMessage('VEHICLE_CREATED', data);
      return data;
    } catch (err) {
      console.error('API addVehicle error:', err);
      throw err;
    }
  },

  async updateVehicle(id: string, updates: Partial<VehicleRecord>): Promise<{ vehicle: VehicleRecord; log: ActivityLog }> {
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update vehicle');
      }
      const data = await res.json();
      this.broadcastLocalMessage('VEHICLE_UPDATED', data);
      return data;
    } catch (err) {
      console.error('API updateVehicle error:', err);
      throw err;
    }
  },

  async deleteVehicle(id: string): Promise<{ success: boolean; vehicleId: string }> {
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete vehicle');
      const data = await res.json();
      this.broadcastLocalMessage('VEHICLE_DELETED', data);
      return data;
    } catch (err) {
      console.error('API deleteVehicle error:', err);
      throw err;
    }
  },

  async addAnnouncement(text: string, type: 'info' | 'alert' | 'promo' = 'info'): Promise<{ announcement: Announcement }> {
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, type }),
      });
      if (!res.ok) throw new Error('Failed to add announcement');
      const data = await res.json();
      this.broadcastLocalMessage('ANNOUNCEMENT_ADDED', data);
      return data;
    } catch (err) {
      console.error('API addAnnouncement error:', err);
      throw err;
    }
  },

  async resetData(): Promise<void> {
    try {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to reset data');
      this.broadcastLocalMessage('DATA_RESET', {});
    } catch (err) {
      console.error('API resetData error:', err);
      throw err;
    }
  },

  broadcastLocalMessage(type: string, payload: unknown) {
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage({ type, data: payload, timestamp: Date.now() });
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }
  },

  subscribeToBroadcastChannel(callback: (msg: { type: string; data: unknown }) => void) {
    if (!broadcastChannel) return () => {};
    const handler = (event: MessageEvent) => {
      if (event.data) {
        callback(event.data);
      }
    };
    broadcastChannel.addEventListener('message', handler);
    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handler);
      }
    };
  },
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { VehicleRecord, Mechanic, Announcement, ActivityLog, WorkshopStats } from '../types';
import { apiClient, saveLocalFallbackState } from './apiClient';
import { audioNotifier } from './audioNotifier';

export function useRealtimeQueue() {
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [connected, setConnected] = useState<boolean>(false);
  const [lastEventTime, setLastEventTime] = useState<string>('');
  const [recentCompletedPlate, setRecentCompletedPlate] = useState<{ plate: string; owner: string } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load Initial Data
  const refreshData = useCallback(async () => {
    try {
      const data = await apiClient.fetchAllData();
      setVehicles(data.vehicles || []);
      setMechanics(data.mechanics || []);
      setAnnouncements(data.announcements || []);
      setActivityLogs(data.activityLogs || []);
      saveLocalFallbackState(data);
    } catch (err) {
      console.error('Failed to refresh data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Connect SSE for Real-Time Server Push
  useEffect(() => {
    refreshData();

    // Setup SSE connection
    try {
      const es = new EventSource('/api/events');
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnected(true);
      };

      es.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          setLastEventTime(new Date().toLocaleTimeString());

          if (payload.type === 'VEHICLE_CREATED') {
            const newVeh = payload.data.vehicle as VehicleRecord;
            setVehicles((prev) => [newVeh, ...prev.filter((v) => v.id !== newVeh.id)]);
            if (payload.data.log) {
              setActivityLogs((prev) => [payload.data.log, ...prev]);
            }
            audioNotifier.playChime('new_incoming');
          } else if (payload.type === 'VEHICLE_UPDATED') {
            const updatedVeh = payload.data.vehicle as VehicleRecord;
            setVehicles((prev) => prev.map((v) => (v.id === updatedVeh.id ? updatedVeh : v)));
            if (payload.data.log) {
              setActivityLogs((prev) => [payload.data.log, ...prev]);
            }

            // Check if status changed to completed -> trigger chime & speech!
            if (payload.data.isCompletedEvent || updatedVeh.status === 'completed') {
              setRecentCompletedPlate({ plate: updatedVeh.plateNumber, owner: updatedVeh.ownerName });
              audioNotifier.announceCompletion(updatedVeh.plateNumber, updatedVeh.ownerName);
              setTimeout(() => setRecentCompletedPlate(null), 8000);
            }
          } else if (payload.type === 'VEHICLE_DELETED') {
            const delId = payload.data.vehicleId;
            setVehicles((prev) => prev.filter((v) => v.id !== delId));
            if (payload.data.log) {
              setActivityLogs((prev) => [payload.data.log, ...prev]);
            }
          } else if (payload.type === 'ANNOUNCEMENTS_UPDATED') {
            setAnnouncements(payload.data.announcements || []);
          } else if (payload.type === 'DATA_RESET') {
            refreshData();
          }
        } catch (e) {
          console.warn('SSE message parse error:', e);
        }
      };

      es.onerror = () => {
        setConnected(false);
        // Fallback polling if disconnected
      };
    } catch (e) {
      console.warn('EventSource initialization error:', e);
    }

    // Subscribe to BroadcastChannel cross-tab fallback
    const unsubscribeBroadcast = apiClient.subscribeToBroadcastChannel((msg) => {
      if (msg.type === 'VEHICLE_CREATED' || msg.type === 'VEHICLE_UPDATED' || msg.type === 'VEHICLE_DELETED' || msg.type === 'DATA_RESET') {
        refreshData();
      }
    });

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      unsubscribeBroadcast();
    };
  }, [refreshData]);

  // Actions
  const addVehicle = async (payload: Partial<VehicleRecord>) => {
    return await apiClient.addVehicle(payload);
  };

  const updateVehicleStatus = async (id: string, newStatus: VehicleRecord['status']) => {
    return await apiClient.updateVehicle(id, { status: newStatus });
  };

  const updateVehicleRecord = async (id: string, updates: Partial<VehicleRecord>) => {
    return await apiClient.updateVehicle(id, updates);
  };

  const deleteVehicle = async (id: string) => {
    return await apiClient.deleteVehicle(id);
  };

  const addAnnouncement = async (text: string, type: 'info' | 'alert' | 'promo' = 'info') => {
    return await apiClient.addAnnouncement(text, type);
  };

  const resetData = async () => {
    return await apiClient.resetData();
  };

  // Compute Workshop Stats
  const stats: WorkshopStats = {
    totalToday: vehicles.length,
    incomingCount: vehicles.filter((v) => v.status === 'incoming').length,
    inProgressCount: vehicles.filter((v) => v.status === 'in_progress').length,
    completedCount: vehicles.filter((v) => v.status === 'completed').length,
    deliveredCount: vehicles.filter((v) => v.status === 'delivered').length,
    avgRepairMinutes: Math.round(
      vehicles.reduce((acc, v) => acc + (v.estimatedDurationMinutes || 45), 0) / (vehicles.length || 1)
    ),
  };

  return {
    vehicles,
    mechanics,
    announcements,
    activityLogs,
    loading,
    connected,
    lastEventTime,
    stats,
    recentCompletedPlate,
    addVehicle,
    updateVehicleStatus,
    updateVehicleRecord,
    deleteVehicle,
    addAnnouncement,
    resetData,
    refreshData,
  };
}

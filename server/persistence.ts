import type {
  ActivityLog,
  Announcement,
  Mechanic,
  ServiceTask,
  VehicleRecord,
  VehicleStatus,
} from '../src/types';
import { getDefaultTasksForService } from '../src/utils/serviceTasks';

export interface WorkshopSnapshot {
  vehicles: VehicleRecord[];
  mechanics: Mechanic[];
  announcements: Announcement[];
  activityLogs: ActivityLog[];
}

export interface CreateVehicleInput {
  ownerName: string;
  ownerPhone?: string;
  plateNumber: string;
  vehicleMake: string;
  vehicleModel?: string;
  serviceType?: string;
  photoUrl?: string;
  bayNumber?: string;
  estimatedDurationMinutes?: number;
  notes?: string;
  priority?: VehicleRecord['priority'];
  mechanicId?: string;
  tasks?: ServiceTask[];
  operatorName?: string;
}

export interface UpdateVehicleInput
  extends Partial<Omit<VehicleRecord, 'id' | 'lastUpdated'>> {
  operatorName?: string;
}

export interface VehicleUpdateResult {
  vehicle: VehicleRecord;
  log: ActivityLog;
  isCompletedEvent: boolean;
}

export interface VehicleDeleteResult {
  vehicleId: string;
  log: ActivityLog;
}

export interface AnnouncementMutationResult {
  announcement: Announcement;
  announcements: Announcement[];
}

export interface AnnouncementDeleteResult {
  announcementId: string;
  announcements: Announcement[];
}

export class InvalidMechanicAssignmentError extends Error {
  constructor(mechanicId: string) {
    super(`Mechanic "${mechanicId}" was not found.`);
    this.name = 'InvalidMechanicAssignmentError';
  }
}

export interface WorkshopPersistence {
  getSnapshot(): Promise<WorkshopSnapshot>;
  listAnnouncements(): Promise<Announcement[]>;
  createVehicle(input: CreateVehicleInput): Promise<{ vehicle: VehicleRecord; log: ActivityLog }>;
  updateVehicle(id: string, updates: UpdateVehicleInput): Promise<VehicleUpdateResult | null>;
  deleteVehicle(id: string, operatorName?: string): Promise<VehicleDeleteResult | null>;
  createAnnouncement(
    input: { text: string; type?: Announcement['type'] }
  ): Promise<AnnouncementMutationResult>;
  updateAnnouncement(
    id: string,
    updates: { text?: string; type?: Announcement['type']; active?: boolean }
  ): Promise<AnnouncementMutationResult | null>;
  deleteAnnouncement(id: string): Promise<AnnouncementDeleteResult | null>;
}

const clonePreset = <T>(preset: T): T => structuredClone(preset);

export function createInMemoryPersistence(
  options: {
    initialVehicles?: VehicleRecord[];
    initialMechanics?: Mechanic[];
    initialAnnouncements?: Announcement[];
    initialActivityLogs?: ActivityLog[];
  } = {}
): WorkshopPersistence {
  let vehiclesStore = clonePreset(options.initialVehicles ?? []);
  let mechanicsStore = clonePreset(options.initialMechanics ?? []);
  let announcementsStore = clonePreset(options.initialAnnouncements ?? []);
  let activityLogsStore = clonePreset(options.initialActivityLogs ?? []);

  const refreshMechanicState = () => {
    mechanicsStore.forEach((mechanic) => {
      mechanic.activeJobsCount = vehiclesStore.filter((vehicle) =>
        vehicle.mechanicId === mechanic.id &&
        vehicle.status !== 'completed' &&
        vehicle.status !== 'delivered'
      ).length;
      if (mechanic.status !== 'off_duty') {
        mechanic.status = mechanic.activeJobsCount > 0 ? 'busy' : 'available';
      }
    });
  };

  refreshMechanicState();

  const getSnapshot = async (): Promise<WorkshopSnapshot> => clonePreset({
    vehicles: vehiclesStore,
    mechanics: mechanicsStore,
    announcements: announcementsStore,
    activityLogs: activityLogsStore,
  });

  return {
    getSnapshot,

    async listAnnouncements() {
      return clonePreset(announcementsStore);
    },

    async createVehicle(input) {
      const assignedMechanic = input.mechanicId
        ? mechanicsStore.find((mechanic) => mechanic.id === input.mechanicId)
        : undefined;
      if (input.mechanicId && !assignedMechanic) {
        throw new InvalidMechanicAssignmentError(input.mechanicId);
      }

      const nowIso = new Date().toISOString();

      const newVehicle: VehicleRecord = {
        id: `v-${Date.now()}`,
        ownerName: input.ownerName.trim(),
        ownerPhone: input.ownerPhone ? input.ownerPhone.trim() : '',
        plateNumber: input.plateNumber.trim().toUpperCase(),
        vehicleMake: input.vehicleMake.trim(),
        vehicleModel: input.vehicleModel ? input.vehicleModel.trim() : input.vehicleMake.trim(),
        serviceType: input.serviceType || 'General Inspection',
        tasks: input.tasks && Array.isArray(input.tasks) && input.tasks.length > 0
          ? input.tasks
          : getDefaultTasksForService(input.serviceType || 'General Inspection'),
        status: 'incoming',
        mechanicId: input.mechanicId,
        mechanicName: assignedMechanic?.name,
        photoUrl: input.photoUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
        bayNumber: input.bayNumber || 'Bay 01',
        entryTime: nowIso,
        estimatedDurationMinutes: Number(input.estimatedDurationMinutes) || 45,
        notes: input.notes || '',
        priority: input.priority || 'normal',
        lastUpdated: nowIso,
      };

      vehiclesStore.unshift(newVehicle);
      refreshMechanicState();

      const log: ActivityLog = {
        id: `log-${Date.now()}`,
        vehicleId: newVehicle.id,
        plateNumber: newVehicle.plateNumber,
        action: `Registered incoming vehicle (${newVehicle.vehicleMake} ${newVehicle.vehicleModel})`,
        newStatus: 'incoming',
        timestamp: nowIso,
        operatorName: input.operatorName || 'Workshop Operator',
      };
      activityLogsStore.unshift(log);

      return { vehicle: newVehicle, log };
    },

    async updateVehicle(id, updates) {
      const vehicleIndex = vehiclesStore.findIndex((vehicle) => vehicle.id === id);
      if (vehicleIndex === -1) return null;

      const currentVehicle = vehiclesStore[vehicleIndex];
      const previousStatus = currentVehicle.status;
      const assignedMechanic = updates.mechanicId && updates.mechanicId !== currentVehicle.mechanicId
        ? mechanicsStore.find((mechanic) => mechanic.id === updates.mechanicId)
        : undefined;
      if (
        updates.mechanicId &&
        updates.mechanicId !== currentVehicle.mechanicId &&
        !assignedMechanic
      ) {
        throw new InvalidMechanicAssignmentError(updates.mechanicId);
      }

      const nowIso = new Date().toISOString();
      let statusChangedToCompleted = false;

      if (updates.status && updates.status !== previousStatus) {
        if (updates.status === 'in_progress' && !currentVehicle.startTime) {
          updates.startTime = nowIso;
        }
        if (updates.status === 'completed' && !currentVehicle.completionTime) {
          updates.completionTime = nowIso;
          statusChangedToCompleted = true;
          if (currentVehicle.tasks) {
            updates.tasks = currentVehicle.tasks.map((task) => ({
              ...task,
              completed: true,
              completedAt: task.completedAt || nowIso,
            }));
          }
        }
      }

      if (updates.mechanicId !== undefined && updates.mechanicId !== currentVehicle.mechanicId) {
        if (updates.mechanicId) {
          updates.mechanicName = assignedMechanic?.name;
        } else {
          updates.mechanicName = undefined;
        }
      }

      const updatedVehicle: VehicleRecord = {
        ...currentVehicle,
        ...updates,
        lastUpdated: nowIso,
      };
      vehiclesStore[vehicleIndex] = updatedVehicle;
      refreshMechanicState();

      let actionText = 'Updated vehicle record';
      if (updates.status && updates.status !== previousStatus) {
        const statusLabels: Record<string, string> = {
          incoming: 'Incoming Intake',
          in_progress: 'Repair Work In Progress',
          completed: 'Service Completed',
          delivered: 'Delivered to Owner',
        };
        actionText = `Status changed to ${statusLabels[updates.status] || updates.status}`;
      }

      const log: ActivityLog = {
        id: `log-${Date.now()}`,
        vehicleId: updatedVehicle.id,
        plateNumber: updatedVehicle.plateNumber,
        action: actionText,
        previousStatus,
        newStatus: updatedVehicle.status,
        timestamp: nowIso,
        operatorName: updates.operatorName || 'Workshop Staff',
      };
      activityLogsStore.unshift(log);

      return { vehicle: updatedVehicle, log, isCompletedEvent: statusChangedToCompleted };
    },

    async deleteVehicle(id, operatorName) {
      const vehicle = vehiclesStore.find((record) => record.id === id);
      if (!vehicle) return null;

      vehiclesStore = vehiclesStore.filter((record) => record.id !== id);
      refreshMechanicState();

      const log: ActivityLog = {
        id: `log-${Date.now()}`,
        vehicleId: id,
        plateNumber: vehicle.plateNumber,
        action: 'Removed vehicle from active queue',
        previousStatus: vehicle.status,
        timestamp: new Date().toISOString(),
        operatorName: operatorName || 'Workshop Operator',
      };
      activityLogsStore.unshift(log);

      return { vehicleId: id, log };
    },

    async createAnnouncement(input) {
      const announcement: Announcement = {
        id: `ann-${Date.now()}`,
        text: input.text.trim().toUpperCase(),
        active: true,
        type: input.type || 'info',
        createdAt: new Date().toISOString(),
      };
      announcementsStore.unshift(announcement);
      return { announcement, announcements: clonePreset(announcementsStore) };
    },

    async updateAnnouncement(id, updates) {
      const index = announcementsStore.findIndex((announcement) => announcement.id === id);
      if (index === -1) return null;

      const current = announcementsStore[index];
      const updated: Announcement = {
        ...current,
        text: typeof updates.text === 'string' && updates.text.trim()
          ? updates.text.trim().toUpperCase()
          : current.text,
        type: updates.type || current.type,
        active: typeof updates.active === 'boolean' ? updates.active : current.active,
      };
      announcementsStore[index] = updated;
      return { announcement: updated, announcements: clonePreset(announcementsStore) };
    },

    async deleteAnnouncement(id) {
      if (!announcementsStore.some((announcement) => announcement.id === id)) {
        return null;
      }
      announcementsStore = announcementsStore.filter((announcement) => announcement.id !== id);
      return { announcementId: id, announcements: clonePreset(announcementsStore) };
    },

  };
}

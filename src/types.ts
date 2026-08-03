export type VehicleStatus = 'incoming' | 'in_progress' | 'completed' | 'delivered';

export type PriorityLevel = 'normal' | 'express' | 'vip';

export interface VehicleRecord {
  id: string;
  ownerName: string;
  ownerPhone: string;
  plateNumber: string;
  vehicleMake: string;
  vehicleModel: string;
  serviceType: string;
  status: VehicleStatus;
  mechanicId?: string;
  mechanicName?: string;
  photoUrl: string;
  bayNumber?: string;
  entryTime: string; // ISO string
  startTime?: string; // ISO string
  completionTime?: string; // ISO string
  estimatedDurationMinutes: number;
  notes?: string;
  priority: PriorityLevel;
  lastUpdated: string; // ISO string
}

export interface Mechanic {
  id: string;
  name: string;
  role: string;
  specialty: string;
  avatarUrl: string;
  activeJobsCount: number;
  status: 'available' | 'busy' | 'off_duty';
}

export interface Announcement {
  id: string;
  text: string;
  active: boolean;
  type: 'info' | 'alert' | 'promo';
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  vehicleId: string;
  plateNumber: string;
  action: string;
  previousStatus?: VehicleStatus;
  newStatus?: VehicleStatus;
  timestamp: string;
  operatorName: string;
}

export interface WorkshopStats {
  totalToday: number;
  incomingCount: number;
  inProgressCount: number;
  completedCount: number;
  deliveredCount: number;
  avgRepairMinutes: number;
}

export type ViewMode = 'tv' | 'mobile' | 'settings';

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  setDoc,
} from 'firebase/firestore';

import { db } from '../firebase';
import type {
  ActivityLog,
  Mechanic,
  ServiceTask,
  VehicleRecord,
  VehicleStatus,
} from '../../types';
import { getDefaultTasksForService } from '../../utils/serviceTasks';

const VEHICLES_COLLECTION = 'vehicles';
const MECHANICS_COLLECTION = 'mechanics';
const ACTIVITY_LOGS_COLLECTION = 'activityLogs';

const vehiclesCollection = collection(db, VEHICLES_COLLECTION);
const mechanicsCollection = collection(db, MECHANICS_COLLECTION);
const activityLogsCollection = collection(db, ACTIVITY_LOGS_COLLECTION);

interface AddVehiclePayload {
  ownerName: string;
  ownerPhone?: string;
  plateNumber: string;
  vehicleMake: string;
  vehicleModel?: string;
  serviceType?: string;
  tasks?: ServiceTask[];
  mechanicId?: string;
  photoUrl?: string;
  bayNumber?: string;
  estimatedDurationMinutes?: number;
  notes?: string;
  priority?: VehicleRecord['priority'];
}

interface UpdateVehicleInput
  extends Partial<Omit<VehicleRecord, 'id' | 'lastUpdated'>> {
  operatorName?: string;
}

const getStatusAction = (status: VehicleStatus): string => {
  switch (status) {
    case 'incoming':
      return 'Incoming Intake';
    case 'in_progress':
      return 'Repair Work In Progress';
    case 'completed':
      return 'Service Completed';
    case 'delivered':
      return 'Delivered to Owner';
    default:
      return 'Vehicle Updated';
  }
};

const createActivityLog = (
  vehicle: VehicleRecord,
  operatorName: string,
  action: string,
  previousStatus?: VehicleStatus,
  newStatus?: VehicleStatus
): ActivityLog => {
  const timestamp = new Date().toISOString();

  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    vehicleId: vehicle.id,
    plateNumber: vehicle.plateNumber,
    action,
    previousStatus,
    newStatus,
    timestamp,
    operatorName,
  };
};

/**
 * Get all vehicles from Firestore.
 */
export async function getVehicles(): Promise<VehicleRecord[]> {
  const snapshot = await getDocs(vehiclesCollection);

  return snapshot.docs.map((document) => {
    return document.data() as VehicleRecord;
  });
}

/**
 * Get one vehicle by ID.
 */
export async function getVehicle(
  vehicleId: string
): Promise<VehicleRecord | null> {
  const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);
  const snapshot = await getDoc(vehicleRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as VehicleRecord;
}

/**
 * Add a new vehicle.
 *
 * Vehicle creation and mechanic assignment are handled inside
 * one Firestore transaction so the vehicle and mechanic state
 * remain consistent.
 */
export async function addVehicle(
  payload: AddVehiclePayload
): Promise<VehicleRecord> {
  const ownerName = payload.ownerName?.trim();
  const plateNumber = payload.plateNumber?.trim();
  const vehicleMake = payload.vehicleMake?.trim();

  if (!ownerName || !plateNumber || !vehicleMake) {
    throw new Error(
      'ownerName, plateNumber and vehicleMake are required.'
    );
  }

  const vehicleId = `v-${Date.now()}`;
  const now = new Date().toISOString();

  const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);

  const vehicle: VehicleRecord = {
    id: vehicleId,
    ownerName,
    ownerPhone: payload.ownerPhone?.trim() ?? '',
    plateNumber,
    vehicleMake,
    vehicleModel: payload.vehicleModel?.trim() ?? '',
    serviceType: payload.serviceType?.trim() || 'General Inspection',
    tasks:
      payload.tasks ??
      getDefaultTasksForService(payload.serviceType || 'General Inspection'),
    status: 'incoming',
    mechanicId: payload.mechanicId,
    photoUrl:
      payload.photoUrl ||
      'https://images.unsplash.com/photo-1486006920555-c77dcf18193c',
    bayNumber: payload.bayNumber || 'Bay 01',
    entryTime: now,
    estimatedDurationMinutes:
      payload.estimatedDurationMinutes ?? 45,
    notes: payload.notes?.trim() ?? '',
    priority: payload.priority ?? 'normal',
    lastUpdated: now,
  };

  const activityLog = createActivityLog(
    vehicle,
    'Workshop Operator',
    `Registered incoming vehicle (${vehicle.plateNumber})`,
    undefined,
    'incoming'
  );

  await runTransaction(db, async (transaction) => {
    let mechanicRef:
      | ReturnType<typeof doc>
      | undefined;

    let mechanic: Mechanic | undefined;

    if (payload.mechanicId) {
      mechanicRef = doc(
        db,
        MECHANICS_COLLECTION,
        payload.mechanicId
      );

      const mechanicSnapshot = await transaction.get(mechanicRef);

      if (!mechanicSnapshot.exists()) {
        throw new Error(
          `Mechanic "${payload.mechanicId}" was not found.`
        );
      }

      mechanic = mechanicSnapshot.data() as Mechanic;
    }

    transaction.set(vehicleRef, vehicle);

    transaction.set(
      doc(db, ACTIVITY_LOGS_COLLECTION, activityLog.id),
      activityLog
    );

    if (mechanicRef && mechanic) {
      transaction.update(mechanicRef, {
        activeJobsCount: mechanic.activeJobsCount + 1,
        status: 'busy',
      });
    }
  });

  return vehicle;
}

/**
 * Update a vehicle.
 *
 * Status transitions, timestamps, mechanic counters and the
 * corresponding activity log are handled atomically.
 */
export async function updateVehicle(
  vehicleId: string,
  updates: UpdateVehicleInput
): Promise<VehicleRecord> {
  const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);

  return runTransaction(db, async (transaction) => {
    const vehicleSnapshot = await transaction.get(vehicleRef);

    if (!vehicleSnapshot.exists()) {
      throw new Error(`Vehicle "${vehicleId}" was not found.`);
    }

    const currentVehicle =
      vehicleSnapshot.data() as VehicleRecord;

    const now = new Date().toISOString();

    const nextVehicle: VehicleRecord = {
      ...currentVehicle,
      ...updates,
      id: currentVehicle.id,
      lastUpdated: now,
    };

    const previousStatus = currentVehicle.status;
    const nextStatus = nextVehicle.status;

    /*
     * Preserve server.ts status transition behavior.
     */
    if (
      nextStatus === 'in_progress' &&
      previousStatus !== 'in_progress' &&
      !currentVehicle.startTime
    ) {
      nextVehicle.startTime = now;
    }

    if (
      nextStatus === 'completed' &&
      previousStatus !== 'completed'
    ) {
      nextVehicle.completionTime =
        currentVehicle.completionTime || now;

      if (nextVehicle.tasks) {
        nextVehicle.tasks = nextVehicle.tasks.map((task) => ({
          ...task,
          completed: true,
          completedAt: task.completedAt || now,
        }));
      }
    }

    /*
     * Prevent operatorName from accidentally being stored
     * inside the VehicleRecord document.
     */
    delete (nextVehicle as Partial<VehicleRecord> & {
      operatorName?: string;
    }).operatorName;

    /*
     * Mechanic assignment changes.
     */
    const oldMechanicId = currentVehicle.mechanicId;
    const newMechanicId = nextVehicle.mechanicId;

    if (oldMechanicId !== newMechanicId) {
      if (oldMechanicId) {
        const oldMechanicRef = doc(
          db,
          MECHANICS_COLLECTION,
          oldMechanicId
        );

        const oldMechanicSnapshot =
          await transaction.get(oldMechanicRef);

        if (oldMechanicSnapshot.exists()) {
          const oldMechanic =
            oldMechanicSnapshot.data() as Mechanic;

          transaction.update(oldMechanicRef, {
            activeJobsCount: Math.max(
              0,
              oldMechanic.activeJobsCount - 1
            ),
            status:
              oldMechanic.activeJobsCount - 1 > 0
                ? 'busy'
                : 'available',
          });
        }
      }

      if (newMechanicId) {
        const newMechanicRef = doc(
          db,
          MECHANICS_COLLECTION,
          newMechanicId
        );

        const newMechanicSnapshot =
          await transaction.get(newMechanicRef);

        if (!newMechanicSnapshot.exists()) {
          throw new Error(
            `Mechanic "${newMechanicId}" was not found.`
          );
        }

        const newMechanic =
          newMechanicSnapshot.data() as Mechanic;

        nextVehicle.mechanicName = newMechanic.name;

        transaction.update(newMechanicRef, {
          activeJobsCount: newMechanic.activeJobsCount + 1,
          status: 'busy',
        });
      } else {
        nextVehicle.mechanicName = undefined;
      }
    }

    const statusChanged = previousStatus !== nextStatus;

    const action = statusChanged
      ? getStatusAction(nextStatus)
      : 'Vehicle Details Updated';

    const activityLog = createActivityLog(
      nextVehicle,
      updates.operatorName || 'Workshop Staff',
      action,
      statusChanged ? previousStatus : undefined,
      statusChanged ? nextStatus : undefined
    );

    transaction.set(vehicleRef, nextVehicle);

    transaction.set(
      doc(
        db,
        ACTIVITY_LOGS_COLLECTION,
        activityLog.id
      ),
      activityLog
    );

    return nextVehicle;
  });
}

/**
 * Delete a vehicle and create an activity log.
 */
export async function deleteVehicle(
  vehicleId: string
): Promise<void> {
  const vehicleRef = doc(db, VEHICLES_COLLECTION, vehicleId);

  await runTransaction(db, async (transaction) => {
    const vehicleSnapshot = await transaction.get(vehicleRef);

    if (!vehicleSnapshot.exists()) {
      throw new Error(`Vehicle "${vehicleId}" was not found.`);
    }

    const vehicle =
      vehicleSnapshot.data() as VehicleRecord;

    /*
     * If the vehicle has a mechanic assigned, release that
     * mechanic's active job count.
     */
    if (vehicle.mechanicId) {
      const mechanicRef = doc(
        db,
        MECHANICS_COLLECTION,
        vehicle.mechanicId
      );

      const mechanicSnapshot =
        await transaction.get(mechanicRef);

      if (mechanicSnapshot.exists()) {
        const mechanic =
          mechanicSnapshot.data() as Mechanic;

        transaction.update(mechanicRef, {
          activeJobsCount: Math.max(
            0,
            mechanic.activeJobsCount - 1
          ),
          status:
            mechanic.activeJobsCount - 1 > 0
              ? 'busy'
              : 'available',
        });
      }
    }

    const activityLog = createActivityLog(
      vehicle,
      'System Admin',
      'Removed vehicle from active queue',
      vehicle.status,
      undefined
    );

    transaction.delete(vehicleRef);

    transaction.set(
      doc(
        db,
        ACTIVITY_LOGS_COLLECTION,
        activityLog.id
      ),
      activityLog
    );
  });
}

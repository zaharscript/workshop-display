import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from 'firebase/firestore';

import { db } from '../firebase';
import type { Mechanic } from '../../types';

const MECHANICS_COLLECTION = 'mechanics';

const mechanicsCollection = collection(
  db,
  MECHANICS_COLLECTION
);

interface AddMechanicPayload {
  name: string;
  role?: string;
  specialty?: string;
  avatarUrl?: string;
  status?: Mechanic['status'];
}

/**
 * Get all mechanics from Firestore.
 */
export async function getMechanics(): Promise<Mechanic[]> {
  const snapshot = await getDocs(mechanicsCollection);

  return snapshot.docs.map((document) => {
    return document.data() as Mechanic;
  });
}

/**
 * Get one mechanic by ID.
 */
export async function getMechanic(
  mechanicId: string
): Promise<Mechanic | null> {
  const mechanicRef = doc(
    db,
    MECHANICS_COLLECTION,
    mechanicId
  );

  const snapshot = await getDoc(mechanicRef);

  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as Mechanic;
}

/**
 * Add a new mechanic.
 */
export async function addMechanic(
  payload: AddMechanicPayload
): Promise<Mechanic> {
  const name = payload.name?.trim();

  if (!name) {
    throw new Error('Mechanic name is required.');
  }

  const mechanicId = `m-${Date.now()}`;

  const mechanic: Mechanic = {
    id: mechanicId,
    name,
    role: payload.role?.trim() || 'Technician',
    specialty: payload.specialty?.trim() || 'General Service',
    avatarUrl: payload.avatarUrl?.trim() || '',
    activeJobsCount: 0,
    status: payload.status ?? 'available',
  };

  const mechanicRef = doc(
    db,
    MECHANICS_COLLECTION,
    mechanicId
  );

  await setDoc(mechanicRef, mechanic);

  return mechanic;
}

/**
 * Update mechanic details.
 *
 * The mechanic ID and active job count cannot be changed
 * through this service. Job counters are managed by the
 * vehicle transaction service.
 */
export async function updateMechanic(
  mechanicId: string,
  updates: Partial<
    Omit<Mechanic, 'id' | 'activeJobsCount'>
  >
): Promise<Mechanic> {
  const mechanicRef = doc(
    db,
    MECHANICS_COLLECTION,
    mechanicId
  );

  const snapshot = await getDoc(mechanicRef);

  if (!snapshot.exists()) {
    throw new Error(
      `Mechanic "${mechanicId}" was not found.`
    );
  }

  const currentMechanic =
    snapshot.data() as Mechanic;

  const nextMechanic: Mechanic = {
    ...currentMechanic,
    ...updates,
    id: currentMechanic.id,
    activeJobsCount: currentMechanic.activeJobsCount,
  };

  if (nextMechanic.name) {
    nextMechanic.name = nextMechanic.name.trim();
  }

  if (nextMechanic.role) {
    nextMechanic.role = nextMechanic.role.trim();
  }

  if (nextMechanic.specialty) {
    nextMechanic.specialty =
      nextMechanic.specialty.trim();
  }

  if (nextMechanic.avatarUrl) {
    nextMechanic.avatarUrl =
      nextMechanic.avatarUrl.trim();
  }

  await setDoc(mechanicRef, nextMechanic);

  return nextMechanic;
}

/**
 * Delete a mechanic.
 *
 * A mechanic with active jobs cannot be deleted.
 */
export async function deleteMechanic(
  mechanicId: string
): Promise<void> {
  const mechanicRef = doc(
    db,
    MECHANICS_COLLECTION,
    mechanicId
  );

  const snapshot = await getDoc(mechanicRef);

  if (!snapshot.exists()) {
    throw new Error(
      `Mechanic "${mechanicId}" was not found.`
    );
  }

  const mechanic =
    snapshot.data() as Mechanic;

  if (mechanic.activeJobsCount > 0) {
    throw new Error(
      `Mechanic "${mechanic.name}" cannot be deleted while they have active jobs.`
    );
  }

  await deleteDoc(mechanicRef);
}

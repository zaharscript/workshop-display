export type OperatorRole = 'mechanic' | 'admin';

export interface OperatorRecord {
  uid: string;
  email: string;
  role: OperatorRole;
  name?: string;
  active: true;
}

export type OperatorPermission =
  | 'viewQueue'
  | 'registerVehicles'
  | 'assignMechanics'
  | 'updateServiceProgress'
  | 'updateTaskChecklist'
  | 'deleteVehicleRecords'
  | 'manageMechanicsAndAnnouncements'
  | 'uploadVehiclePhotos'
  | 'manageOperatorAccounts';

const rolePermissions: Record<OperatorRole, readonly OperatorPermission[]> = {
  admin: [
    'viewQueue',
    'registerVehicles',
    'assignMechanics',
    'updateServiceProgress',
    'updateTaskChecklist',
    'deleteVehicleRecords',
    'manageMechanicsAndAnnouncements',
    'uploadVehiclePhotos',
    'manageOperatorAccounts',
  ],
  mechanic: [
    'viewQueue',
    'registerVehicles',
    'updateServiceProgress',
    'updateTaskChecklist',
    'deleteVehicleRecords',
    'uploadVehiclePhotos',
  ],
};

export function hasOperatorPermission(
  role: OperatorRole | null,
  permission: OperatorPermission
): boolean {
  return role !== null && rolePermissions[role].includes(permission);
}

export function validateOperatorDocument(
  uid: string,
  email: string,
  data: Record<string, unknown>
): OperatorRecord | null {
  if (!data || data.active !== true) return null;
  if (data.role !== 'mechanic' && data.role !== 'admin') return null;

  return {
    uid,
    email,
    role: data.role,
    name: typeof data.name === 'string' && data.name.trim() ? data.name.trim() : undefined,
    active: true,
  };
}

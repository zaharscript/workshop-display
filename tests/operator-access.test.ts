import assert from 'node:assert/strict';
import test from 'node:test';

import {
  hasOperatorPermission,
  validateOperatorDocument,
  type OperatorPermission,
  type OperatorRole,
} from '../src/lib/operatorAccess';

const permissions: OperatorPermission[] = [
  'viewQueue',
  'registerVehicles',
  'assignMechanics',
  'updateServiceProgress',
  'updateTaskChecklist',
  'deleteVehicleRecords',
  'manageMechanicsAndAnnouncements',
  'uploadVehiclePhotos',
  'manageOperatorAccounts',
];

test('operator permission matrix allows only the intended mechanic capabilities', () => {
  const mechanicPermissions = new Set<OperatorPermission>([
    'viewQueue',
    'registerVehicles',
    'updateServiceProgress',
    'updateTaskChecklist',
    'deleteVehicleRecords',
    'uploadVehiclePhotos',
  ]);

  for (const permission of permissions) {
    assert.equal(
      hasOperatorPermission('admin', permission),
      true,
      `admin should have ${permission}`
    );
    assert.equal(
      hasOperatorPermission('mechanic', permission),
      mechanicPermissions.has(permission),
      `mechanic permission mismatch for ${permission}`
    );
    assert.equal(hasOperatorPermission(null, permission), false);
  }
});

test('operator document validation requires active status and an exact supported role', () => {
  const baseDocument = { email: 'operator@example.test', active: true };

  for (const role of ['admin', 'mechanic'] satisfies OperatorRole[]) {
    assert.deepEqual(
      validateOperatorDocument('uid-1', 'auth@example.test', { ...baseDocument, role }),
      {
        uid: 'uid-1',
        email: 'auth@example.test',
        role,
        name: undefined,
        active: true,
      }
    );
  }

  assert.equal(validateOperatorDocument('uid-1', '', { role: 'admin', active: false }), null);
  assert.equal(validateOperatorDocument('uid-1', '', { role: 'viewer', active: true }), null);
  assert.equal(validateOperatorDocument('uid-1', '', { role: 'Admin', active: true }), null);
  assert.equal(validateOperatorDocument('uid-1', '', { role: 'mechanic' }), null);
});

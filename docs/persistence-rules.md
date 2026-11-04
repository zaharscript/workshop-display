# Persistence Rules

This document records the approved behavior for persistence implementations of
the Workshop Display API. The in-memory adapter is the current executable
contract; Firestore integration is not implemented here.

## Approved rules

1. **Active-job count:** A mechanic's count is the number of vehicles assigned
   to that mechanic whose status is neither `completed` nor `delivered`.
2. **Invalid mechanic assignment:** Creating or assigning a vehicle to a
   nonexistent mechanic is rejected with a clear error. The failed operation
   must not partially update the vehicle, mechanic, or activity logs.
3. **Mechanic availability:** Preserve `off_duty`. For all other mechanics,
   derive status as `busy` when active-job count is greater than zero and
   `available` when it is zero.
4. **Ordering:** Preserve preset order. Newly created vehicles, announcements,
   and activity logs appear newest first. Updating a record does not reorder
   it.
5. **Reset boundary:** Reset is for authorized administrators only and is
   restricted to development/test environments. It must fail closed if the
   environment is missing or uncertain. The current Express reset route and
   in-memory adapter do not enforce authorization or environment restrictions;
   this boundary must be implemented before exposing reset with persistent
   production data.
6. **Activity-log retention:** Retain all logs for now. No retention limit is
   approved; decide retention separately.

## Current implementation scope

The in-memory adapter enforces active-job counts, invalid-assignment rejection,
mechanic availability derivation, ordering, and reset clearing of logs. Its
reset operation itself is not protected by environment or authorization
checks. API reset tests therefore verify only the in-memory reset effect and
instance isolation; they do not imply reset authorization is enforced.

Firestore and other persistent adapters must satisfy the same data and ordering
rules while applying coupled vehicle, mechanic, and activity-log writes
atomically. Reset authorization and environment checks remain an API/startup
boundary in addition to adapter behavior.

## Proposed Firestore schema and ordering

This is a design proposal only; no Firestore schema or data has been created.

| Collection | Document ID and fields | Ordering |
| --- | --- | --- |
| `vehicles/{vehicleId}` | Stable document ID mirrored in an explicit `id` field; `VehicleRecord` fields, plus `presetOrder` for seeded records and `createdSequence` for created records. | Preset records use their original array ordinal. Created records use a monotonically allocated sequence; sort created records descending, followed by presets in ascending ordinal. |
| `mechanics/{mechanicId}` | Stable document ID mirrored in `id`; `Mechanic` fields, including derived `activeJobsCount` and status. | Preset ordinal; updates do not change it. |
| `announcements/{announcementId}` | Stable document ID mirrored in `id`; `Announcement` fields, plus preset/order metadata. | Created records newest first by sequence, followed by presets in original order; updates do not change order. |
| `activityLogs/{logId}` | Collision-resistant stable document ID mirrored in `id`; `ActivityLog` fields, plus `createdSequence`. | Sequence descending; retain all records. |

The sequence is a proposed Firestore ordering mechanism, not an implemented
counter. A future adapter must allocate it transactionally and include a stable
ID as a tie-breaker. Vehicle lifecycle times, task completion times,
announcement creation times, and log timestamps must be serialized as ISO-8601
strings in API responses, even if stored as Firestore timestamps internally.
Document reads must derive/verify `id` from the document path and return it
explicitly.

### Existing-data migration

Before cutover, take a backup and inspect the target environment through an
approved migration process. For each existing collection, preserve document
IDs, validate required fields, normalize timestamps to the API ISO-string
contract, and assign deterministic preset/order metadata from the existing
intended ordering. Reconcile mechanic active-job counts from vehicles using
the approved status rule, while preserving `off_duty`. Do not seed on every
server start or overwrite unknown existing data. No migration has been run.

## Startup selection and security gate

Startup requires `NODE_ENV` to be exactly `development`, `test`, or
`production`; missing or unrecognized values fail. Development and test default
to in-memory persistence when `WORKSHOP_PERSISTENCE` is omitted. Production
requires an explicit `WORKSHOP_PERSISTENCE` value: `memory` selects the
in-memory adapter, while missing, malformed, or unsupported values fail
startup. Selecting `firestore` additionally requires the exact server-side
value `WORKSHOP_FIRESTORE_AUTHORIZATION=enabled` and still fails closed because
the Firestore persistence adapter is not implemented. No mode silently falls
back to memory, and no client `VITE_` value is used for Admin SDK initialization.

`createApp()` remains independently injectable and defaults to a fresh
in-memory adapter; normal startup goes through the startup selector.

The Firestore rules enforce active `admin`/`mechanic` operator access, admin-only
mechanic assignment, vehicle deletion by either role, mechanic roster and
announcement management, and client-immutable activity logs. Operator documents
are client read-only and must be provisioned outside browser code. A trusted
server SDK may bypass client Firestore rules. Express mutation routes
independently verify Firebase ID tokens and active operator documents before
applying their role permissions. Public display reads and the read-only event
stream remain unauthenticated. No reset route is exposed; any future reset must
be administrator-only and restricted to known development/test environments.

## API error mapping and snapshot ownership

- Invalid mechanic assignment: HTTP 400 with `{ "error": "<message>" }`; no
  vehicle, mechanic, or log mutation.
- Missing vehicle or announcement: HTTP 404 with the route's established
  `{ "error": "<message>" }` response.
- Operational persistence/configuration failure: HTTP 500; never return a
  success envelope or emit a success SSE event.
- Successful REST envelopes and SSE event names/payloads remain unchanged.
- `getSnapshot()` returns detached data. Mutating a returned snapshot cannot
  change adapter state; callers must use persistence methods to make changes.

The in-memory adapter raises a dedicated invalid-assignment error, which the
vehicle create/update routes map to HTTP 400. Other persistence errors continue
through Express error handling and do not produce success SSE broadcasts.

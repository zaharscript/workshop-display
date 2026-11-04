import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  createStartupPersistence,
} from './server/persistence-selection';
import {
  createInMemoryPersistence,
  InvalidMechanicAssignmentError,
  type CreateVehicleInput,
  type UpdateVehicleInput,
  type WorkshopPersistence,
} from './server/persistence';
import {
  getOperatorName,
  requireOperatorPermission,
  type OperatorAuthenticator,
} from './server/operator-auth';
import { hasOperatorPermission } from './src/lib/operatorAccess';

const PORT = 3000;

type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (handler: AsyncHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    void handler(req, res, next).catch(next);
  };

export function createApp(
  persistence: WorkshopPersistence = createInMemoryPersistence(),
  authenticateOperator?: OperatorAuthenticator
) {
  const app = express();

  app.use(express.json({ limit: '10mb' }));

  // SSE Clients Registry for Real-Time Live Push
  interface SSEClient {
    id: string;
    res: Response;
  }
  let sseClients: SSEClient[] = [];

  function broadcastToClients(eventType: string, payload: unknown) {
    const data = JSON.stringify({ type: eventType, data: payload, timestamp: new Date().toISOString() });
    sseClients.forEach((client) => {
      try {
        client.res.write(`data: ${data}\n\n`);
      } catch (e) {
        console.error('Failed to write SSE to client', client.id, e);
      }
    });
  }

  const operatorPermission = (
    permission: Parameters<typeof requireOperatorPermission>[0]
  ) => requireOperatorPermission(permission, authenticateOperator);
  const isRecord = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === 'object' && !Array.isArray(value);
  const hasOnlyKeys = (body: Record<string, unknown>, keys: readonly string[]) =>
    Object.keys(body).every((key) => keys.includes(key));
  const isAnnouncementType = (
    value: unknown
  ): value is 'info' | 'alert' | 'promo' =>
    value === 'info' || value === 'alert' || value === 'promo';
  const isOptionalStringField = (body: Record<string, unknown>, key: string) =>
    body[key] === undefined || typeof body[key] === 'string';
  const isTaskList = (value: unknown) =>
    value === undefined ||
    (Array.isArray(value) && value.every((task) =>
      isRecord(task) &&
      typeof task.id === 'string' &&
      typeof task.title === 'string' &&
      typeof task.completed === 'boolean' &&
      (task.completedAt === undefined || typeof task.completedAt === 'string')
    ));
  const isCreateVehiclePayload = (
    body: Record<string, unknown>
  ): body is Record<string, unknown> & CreateVehicleInput => {
    const stringFields = [
      'ownerPhone', 'vehicleModel', 'serviceType', 'photoUrl', 'bayNumber', 'notes',
      'mechanicId',
    ];
    return hasOnlyKeys(body, [
      'ownerName', 'ownerPhone', 'plateNumber', 'vehicleMake', 'vehicleModel',
      'serviceType', 'photoUrl', 'bayNumber', 'estimatedDurationMinutes', 'notes',
      'priority', 'mechanicId', 'tasks',
    ]) &&
      typeof body.ownerName === 'string' &&
      typeof body.plateNumber === 'string' &&
      typeof body.vehicleMake === 'string' &&
      stringFields.every((key) => isOptionalStringField(body, key)) &&
      (body.estimatedDurationMinutes === undefined ||
        (typeof body.estimatedDurationMinutes === 'number' &&
          Number.isFinite(body.estimatedDurationMinutes))) &&
      (body.priority === undefined ||
        body.priority === 'normal' || body.priority === 'express' || body.priority === 'vip') &&
      isTaskList(body.tasks);
  };
  const isVehicleUpdatePayload = (
    body: Record<string, unknown>
  ): body is Record<string, unknown> & UpdateVehicleInput => {
    const stringFields = [
      'ownerName', 'ownerPhone', 'plateNumber', 'vehicleMake', 'vehicleModel',
      'serviceType', 'mechanicId', 'photoUrl', 'bayNumber', 'notes',
    ];
    return hasOnlyKeys(body, [
      ...stringFields, 'tasks', 'status', 'estimatedDurationMinutes', 'priority',
    ]) &&
      stringFields.every((key) => isOptionalStringField(body, key)) &&
      (body.status === undefined ||
        body.status === 'incoming' || body.status === 'in_progress' ||
        body.status === 'completed' || body.status === 'delivered') &&
      (body.estimatedDurationMinutes === undefined ||
        (typeof body.estimatedDurationMinutes === 'number' &&
          Number.isFinite(body.estimatedDurationMinutes))) &&
      (body.priority === undefined ||
        body.priority === 'normal' || body.priority === 'express' || body.priority === 'vip') &&
      isTaskList(body.tasks);
  };

  // REST API Endpoints

  // SSE Real-Time Event Stream
  app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const newClient: SSEClient = { id: clientId, res };
  sseClients.push(newClient);

  // Send initial handshake ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId })}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c.id !== clientId);
  });
});

// GET /api/vehicles
  app.get('/api/vehicles', asyncHandler(async (_req, res) => {
    res.json(await persistence.getSnapshot());
  }));

// POST /api/vehicles (Intake new vehicle)
  app.post('/api/vehicles', operatorPermission('registerVehicles'), asyncHandler(async (req, res) => {
  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'Vehicle data is invalid.' });
    return;
  }
  if (
    typeof req.body.ownerName !== 'string' || !req.body.ownerName.trim() ||
    typeof req.body.plateNumber !== 'string' || !req.body.plateNumber.trim() ||
    typeof req.body.vehicleMake !== 'string' || !req.body.vehicleMake.trim()
  ) {
    res.status(400).json({
      error: 'Owner name, plate number, and vehicle make are required.',
    });
    return;
  }
  if (!isCreateVehiclePayload(req.body)) {
    res.status(400).json({ error: 'Vehicle data is invalid.' });
    return;
  }
  const operator = req.operator;
  if (!operator) {
    res.status(503).json({ error: 'Operator verification is temporarily unavailable.' });
    return;
  }
  if (
    req.body.mechanicId !== undefined &&
    req.body.mechanicId !== null &&
    req.body.mechanicId !== '' &&
    !hasOperatorPermission(operator.role, 'assignMechanics')
  ) {
    res.status(403).json({ error: 'Only administrators may assign mechanics.' });
    return;
  }
  const {
    ownerName,
    ownerPhone,
    plateNumber,
    vehicleMake,
    vehicleModel,
    serviceType,
    photoUrl,
    bayNumber,
    estimatedDurationMinutes,
    notes,
    priority,
    mechanicId,
  } = req.body;

  if (!ownerName || !plateNumber || !vehicleMake) {
    res.status(400).json({ error: 'Owner name, plate number, and vehicle make are required.' });
    return;
  }

  let result: Awaited<ReturnType<WorkshopPersistence['createVehicle']>>;
  try {
    result = await persistence.createVehicle({
      ownerName,
      ownerPhone,
      plateNumber,
      vehicleMake,
      vehicleModel,
      serviceType,
      photoUrl,
      bayNumber,
      estimatedDurationMinutes,
      notes,
      priority,
      mechanicId,
      tasks: req.body.tasks,
      operatorName: getOperatorName(req),
    });
  } catch (error) {
    if (error instanceof InvalidMechanicAssignmentError) {
      res.status(400).json({ error: error.message });
      return;
    }
    throw error;
  }

  broadcastToClients('VEHICLE_CREATED', result);
  res.status(201).json(result);
}));

// PATCH /api/vehicles/:id (Update status, mechanic, etc.)
  app.patch(
    '/api/vehicles/:id',
    operatorPermission('updateServiceProgress'),
    asyncHandler(async (req, res) => {
    if (!isRecord(req.body) || !isVehicleUpdatePayload(req.body)) {
      res.status(400).json({ error: 'Vehicle updates are invalid.' });
      return;
    }
    const operator = req.operator;
    if (!operator) {
      res.status(503).json({ error: 'Operator verification is temporarily unavailable.' });
      return;
    }
    if (
      Object.hasOwn(req.body, 'mechanicId') &&
      !hasOperatorPermission(operator.role, 'assignMechanics')
    ) {
      res.status(403).json({ error: 'Only administrators may assign mechanics.' });
      return;
    }
    if (
      Object.hasOwn(req.body, 'tasks') &&
      !hasOperatorPermission(operator.role, 'updateTaskChecklist')
    ) {
      res.status(403).json({ error: 'This operator role cannot update task checklists.' });
      return;
    }

    let result: Awaited<ReturnType<WorkshopPersistence['updateVehicle']>>;
    try {
      result = await persistence.updateVehicle(req.params.id, {
        ...req.body,
        operatorName: getOperatorName(req),
      });
    } catch (error) {
      if (error instanceof InvalidMechanicAssignmentError) {
        res.status(400).json({ error: error.message });
        return;
      }
      throw error;
    }
    if (!result) {
      res.status(404).json({ error: 'Vehicle not found.' });
      return;
    }

    broadcastToClients('VEHICLE_UPDATED', {
      vehicle: result.vehicle,
      log: result.log,
      isCompletedEvent: result.isCompletedEvent,
    });
    res.json({ vehicle: result.vehicle, log: result.log });
  }));

// DELETE /api/vehicles/:id
  app.delete('/api/vehicles/:id', operatorPermission('deleteVehicleRecords'), asyncHandler(async (req, res) => {
    const result = await persistence.deleteVehicle(req.params.id, getOperatorName(req));
    if (!result) {
      res.status(404).json({ error: 'Vehicle record not found.' });
      return;
    }

    broadcastToClients('VEHICLE_DELETED', result);
    res.json({ success: true, vehicleId: result.vehicleId });
  }));

// GET /api/announcements
  app.get('/api/announcements', asyncHandler(async (_req, res) => {
    res.json({ announcements: await persistence.listAnnouncements() });
  }));

// POST /api/announcements
  app.post('/api/announcements', operatorPermission('manageMechanicsAndAnnouncements'), asyncHandler(async (req, res) => {
  if (!isRecord(req.body)) {
    res.status(400).json({ error: 'Announcement data is invalid.' });
    return;
  }
  if (!hasOnlyKeys(req.body, ['text', 'type'])) {
    res.status(400).json({ error: 'Announcement data is invalid.' });
    return;
  }
  const text = typeof req.body.text === 'string' ? req.body.text : undefined;
  const type = isAnnouncementType(req.body.type) ? req.body.type : undefined;
  if (!text?.trim()) {
    res.status(400).json({ error: 'Announcement text is required.' });
    return;
  }
  if (req.body.type !== undefined && type === undefined) {
    res.status(400).json({ error: 'Announcement data is invalid.' });
    return;
  }
  const result = await persistence.createAnnouncement({ text, type });
  broadcastToClients('ANNOUNCEMENTS_UPDATED', { announcements: result.announcements });
  res.status(201).json({ announcement: result.announcement });
}));

// DELETE /api/announcements/:id
  app.delete('/api/announcements/:id', operatorPermission('manageMechanicsAndAnnouncements'), asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await persistence.deleteAnnouncement(id);
    if (!result) {
      res.status(404).json({ error: 'Announcement not found.' });
      return;
    }
    broadcastToClients('ANNOUNCEMENTS_UPDATED', { announcements: result.announcements });
    res.json({ success: true, announcementId: result.announcementId });
  }));

// PUT /api/announcements/:id
  app.put('/api/announcements/:id', operatorPermission('manageMechanicsAndAnnouncements'), asyncHandler(async (req, res) => {
  if (
    !isRecord(req.body) ||
    !hasOnlyKeys(req.body, ['text', 'type', 'active'])
  ) {
    res.status(400).json({ error: 'Announcement updates are invalid.' });
    return;
  }
  const { id } = req.params;
  const text = typeof req.body.text === 'string' ? req.body.text : undefined;
  const type = isAnnouncementType(req.body.type) ? req.body.type : undefined;
  const active = typeof req.body.active === 'boolean' ? req.body.active : undefined;
  if (req.body.text !== undefined && text === undefined) {
    res.status(400).json({ error: 'Announcement updates are invalid.' });
    return;
  }
  if (req.body.type !== undefined && type === undefined) {
    res.status(400).json({ error: 'Announcement updates are invalid.' });
    return;
  }
  if (req.body.active !== undefined && active === undefined) {
    res.status(400).json({ error: 'Announcement updates are invalid.' });
    return;
  }
  const result = await persistence.updateAnnouncement(id, { text, type, active });
  if (!result) {
    res.status(404).json({ error: 'Announcement not found.' });
    return;
  }
  broadcastToClients('ANNOUNCEMENTS_UPDATED', { announcements: result.announcements });
  res.json({ announcement: result.announcement });
}));

  return app;
}

// Start Express Server & Vite Middleware
export async function startServer() {
  const app = createApp(createStartupPersistence());

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚗 Workshop Display System running at http://0.0.0.0:${PORT}`);
  });
}

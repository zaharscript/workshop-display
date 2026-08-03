import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { INITIAL_VEHICLES, INITIAL_MECHANICS, INITIAL_ANNOUNCEMENTS } from './src/data/presetData';
import { VehicleRecord, Mechanic, Announcement, ActivityLog } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory Database Store
let vehiclesStore: VehicleRecord[] = [...INITIAL_VEHICLES];
let mechanicsStore: Mechanic[] = [...INITIAL_MECHANICS];
let announcementsStore: Announcement[] = [...INITIAL_ANNOUNCEMENTS];
let activityLogsStore: ActivityLog[] = [
  {
    id: 'log-1',
    vehicleId: 'v-106',
    plateNumber: 'PNG 883',
    action: 'Status updated to Service Completed',
    previousStatus: 'in_progress',
    newStatus: 'completed',
    timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    operatorName: 'Master Azman',
  },
  {
    id: 'log-2',
    vehicleId: 'v-107',
    plateNumber: 'ND 5512',
    action: 'Status updated to Service Completed',
    previousStatus: 'in_progress',
    newStatus: 'completed',
    timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    operatorName: 'Technician Hafiz',
  },
];

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
app.get('/api/vehicles', (_req: Request, res: Response) => {
  res.json({
    vehicles: vehiclesStore,
    mechanics: mechanicsStore,
    announcements: announcementsStore,
    activityLogs: activityLogsStore,
  });
});

// POST /api/vehicles (Intake new vehicle)
app.post('/api/vehicles', (req: Request, res: Response) => {
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

  const newId = `v-${Date.now()}`;
  const nowIso = new Date().toISOString();

  let assignedMechanicName: string | undefined = undefined;
  if (mechanicId) {
    const mech = mechanicsStore.find((m) => m.id === mechanicId);
    if (mech) {
      assignedMechanicName = mech.name;
      mech.activeJobsCount += 1;
      mech.status = 'busy';
    }
  }

  const newVehicle: VehicleRecord = {
    id: newId,
    ownerName: ownerName.trim(),
    ownerPhone: ownerPhone ? ownerPhone.trim() : '',
    plateNumber: plateNumber.trim().toUpperCase(),
    vehicleMake: vehicleMake.trim(),
    vehicleModel: vehicleModel ? vehicleModel.trim() : vehicleMake.trim(),
    serviceType: serviceType || 'General Inspection',
    status: 'incoming',
    mechanicId,
    mechanicName: assignedMechanicName,
    photoUrl: photoUrl || 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
    bayNumber: bayNumber || 'Bay 01',
    entryTime: nowIso,
    estimatedDurationMinutes: Number(estimatedDurationMinutes) || 45,
    notes: notes || '',
    priority: priority || 'normal',
    lastUpdated: nowIso,
  };

  vehiclesStore.unshift(newVehicle);

  const log: ActivityLog = {
    id: `log-${Date.now()}`,
    vehicleId: newVehicle.id,
    plateNumber: newVehicle.plateNumber,
    action: `Registered incoming vehicle (${newVehicle.vehicleMake} ${newVehicle.vehicleModel})`,
    newStatus: 'incoming',
    timestamp: nowIso,
    operatorName: 'Workshop Operator',
  };
  activityLogsStore.unshift(log);

  broadcastToClients('VEHICLE_CREATED', { vehicle: newVehicle, log });
  res.status(201).json({ vehicle: newVehicle, log });
});

// PATCH /api/vehicles/:id (Update status, mechanic, etc.)
app.patch('/api/vehicles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const vehicleIndex = vehiclesStore.findIndex((v) => v.id === id);

  if (vehicleIndex === -1) {
    res.status(404).json({ error: 'Vehicle not found.' });
    return;
  }

  const currentVehicle = vehiclesStore[vehicleIndex];
  const previousStatus = currentVehicle.status;
  const updates = req.body;
  const nowIso = new Date().toISOString();

  let statusChangedToCompleted = false;

  // Track state transitions
  if (updates.status && updates.status !== previousStatus) {
    if (updates.status === 'in_progress' && !currentVehicle.startTime) {
      updates.startTime = nowIso;
    }
    if (updates.status === 'completed' && !currentVehicle.completionTime) {
      updates.completionTime = nowIso;
      statusChangedToCompleted = true;
    }
  }

  // Handle mechanic assignment change
  if (updates.mechanicId !== undefined && updates.mechanicId !== currentVehicle.mechanicId) {
    if (updates.mechanicId) {
      const newMech = mechanicsStore.find((m) => m.id === updates.mechanicId);
      if (newMech) {
        updates.mechanicName = newMech.name;
        newMech.activeJobsCount += 1;
      }
    } else {
      updates.mechanicName = undefined;
    }
    if (currentVehicle.mechanicId) {
      const oldMech = mechanicsStore.find((m) => m.id === currentVehicle.mechanicId);
      if (oldMech) {
        oldMech.activeJobsCount = Math.max(0, oldMech.activeJobsCount - 1);
      }
    }
  }

  const updatedVehicle: VehicleRecord = {
    ...currentVehicle,
    ...updates,
    lastUpdated: nowIso,
  };

  vehiclesStore[vehicleIndex] = updatedVehicle;

  // Log activity
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

  broadcastToClients('VEHICLE_UPDATED', {
    vehicle: updatedVehicle,
    log,
    isCompletedEvent: statusChangedToCompleted,
  });

  res.json({ vehicle: updatedVehicle, log });
});

// DELETE /api/vehicles/:id
app.delete('/api/vehicles/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const vehicle = vehiclesStore.find((v) => v.id === id);

  if (!vehicle) {
    res.status(404).json({ error: 'Vehicle record not found.' });
    return;
  }

  vehiclesStore = vehiclesStore.filter((v) => v.id !== id);

  const log: ActivityLog = {
    id: `log-${Date.now()}`,
    vehicleId: id,
    plateNumber: vehicle.plateNumber,
    action: 'Removed vehicle from active queue',
    previousStatus: vehicle.status,
    timestamp: new Date().toISOString(),
    operatorName: 'System Admin',
  };
  activityLogsStore.unshift(log);

  broadcastToClients('VEHICLE_DELETED', { vehicleId: id, log });
  res.json({ success: true, vehicleId: id });
});

// GET /api/announcements
app.get('/api/announcements', (_req: Request, res: Response) => {
  res.json({ announcements: announcementsStore });
});

// POST /api/announcements
app.post('/api/announcements', (req: Request, res: Response) => {
  const { text, type } = req.body;
  if (!text) {
    res.status(400).json({ error: 'Announcement text is required.' });
    return;
  }
  const newAnn: Announcement = {
    id: `ann-${Date.now()}`,
    text: text.trim().toUpperCase(),
    active: true,
    type: type || 'info',
    createdAt: new Date().toISOString(),
  };
  announcementsStore.unshift(newAnn);
  broadcastToClients('ANNOUNCEMENTS_UPDATED', { announcements: announcementsStore });
  res.status(201).json({ announcement: newAnn });
});

// POST /api/reset (Reset Demo Data)
app.post('/api/reset', (_req: Request, res: Response) => {
  vehiclesStore = [...INITIAL_VEHICLES];
  mechanicsStore = [...INITIAL_MECHANICS];
  announcementsStore = [...INITIAL_ANNOUNCEMENTS];
  activityLogsStore = [];
  broadcastToClients('DATA_RESET', {
    vehicles: vehiclesStore,
    mechanics: mechanicsStore,
    announcements: announcementsStore,
  });
  res.json({ success: true, message: 'Workshop display state reset to initial preset.' });
});

// Start Express Server & Vite Middleware
async function startServer() {
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

startServer();

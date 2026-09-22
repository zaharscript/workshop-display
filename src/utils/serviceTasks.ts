import { ServiceTask, VehicleStatus } from '../types';

/**
 * Standard task templates based on Malaysian workshop service categories
 */
const SERVICE_TASK_TEMPLATES: Record<string, string[]> = {
  oil: [
    'Salir minyak enjin lama & periksa sisa keladak',
    'Tukar penapis minyak (oil filter) & washer skru kawah',
    'Isi minyak enjin sintetik baru mengikut sukatan liter spesifikasi',
    'Periksa paras cecair penyejuk (coolant), brek & wiper',
    'Pemeriksaan penapis udara (air filter) & kabin',
    'Reset meter penunjuk selang servis odometer',
  ],
  brake: [
    'Buka tayar & tanggalkan angkup caliper brek',
    'Periksa ketebalan pad brek & kehausan cakera rotor',
    'Pasang pad brek seramik baru & gris pin panduan (slider pin)',
    'Flushing cecair brek DOT4 & bleed udara sistem tekanan',
    'Ujian cengkaman brek tangan (handbrake / EPB) & pandu uji',
  ],
  diagnostic: [
    'Sambung pengimbas OBD-II & imbas log ralat ECU',
    'Periksa & ganti palam pencetus (spark plugs) iridium',
    'Uji rintangan & voltan gegelung penyalaan (ignition coil)',
    'Pembersihan pendikit minyak (throttle body) & sensor MAF',
    'Padam kod ralat (clear DTC) & ujian pemetaan prestasi',
  ],
  aircond: [
    'Ujian tekanan manifold gas penyejuk & pengesanan kebocoran',
    'Flushing vakum sistem & tambah minyak pelincir kompresor PAG',
    'Pengisian gas penyejuk R134a/R1234yf mengikut sukatan gram',
    'Penukaran penapis kabin anti-bakteria (cabin filter)',
    'Ujian suhu corong hembusan kabin (Sasaran < 8°C)',
  ],
  suspension: [
    'Pemeriksaan gegaran pada strut absorber hadapan & belakang',
    'Tukar absorber & pasang mangkuk getah (strut mount) baru',
    'Pemeriksaan lower arm ball joint, link stabilizer & bush getah',
    'Ketatkan semua bolt rangka casis mengikut spesifikasi tork',
    'Pandu uji redaman jalan beralun & kestabilan stereng',
  ],
  tyre: [
    'Buka roda & pasang tayar baru pada rim',
    'Imbangan roda berkomputer (dynamic wheel balancing) 4-biji',
    'Pasang roda kembali & ketatkan nut tayar mengikut tork spesifikasi',
    'Pelarasan jajaran roda digital 3D (laser wheel alignment)',
    'Pemeriksaan tekanan angin & kalibrasi sensor TPMS',
  ],
  gearbox: [
    'Salir minyak transmisi lama (ATF/CVTF) & periksa magnet takung',
    'Ganti penapis minyak transmisi dalaman & gasket kawah minyak',
    'Isi cecair transmisi sintetik mengikut suhu & aras sukatan aras tepat',
    'Pemeriksaan peralihan gear & kalibrasi klac elektronik',
    'Pandu uji kelancaran gear & semakan kebocoran seal',
  ],
  electrical: [
    'Ujian kesihatan bateri (CCA bateri & voltan rehat digital)',
    'Pemeriksaan voltan pengecasan alternator & voltan drop kabel bumi',
    'Periksa kotak fius utama, terminal & penyambung geganti (relays)',
    'Ujian lampu hadapan, lampu brek, hon & sistem sensor kenderaan',
    'Pengimbasan status modul komputer pengurusan kuasa bateri',
  ],
  general: [
    'Pemeriksaan keselamatan 21-titik bawah kenderaan & casis',
    'Periksa paras semua cecair (enjin, brek, coolant, stereng)',
    'Pemeriksaan tali sawat enjin (fan belt / serpentine belt)',
    'Ujian bilah pengelap cermin (wiper), lampu & bateri',
    'Pemeriksaan tekanan tayar & pandu uji akhir keselamatan',
  ],
};

/**
 * Determine the best matching task template based on service name/category
 */
export function getDefaultTasksForService(
  serviceType: string,
  isAllCompleted = false
): ServiceTask[] {
  const lower = (serviceType || '').toLowerCase();

  let template: string[];
  if (lower.includes('minyak') || lower.includes('oil') || lower.includes('penyelenggaraan')) {
    template = SERVICE_TASK_TEMPLATES.oil;
  } else if (lower.includes('brek') || lower.includes('brake') || lower.includes('rotor')) {
    template = SERVICE_TASK_TEMPLATES.brake;
  } else if (lower.includes('diagnostik') || lower.includes('ecu') || lower.includes('palam') || lower.includes('spark')) {
    template = SERVICE_TASK_TEMPLATES.diagnostic;
  } else if (lower.includes('aircond') || lower.includes('dingin') || lower.includes('gas')) {
    template = SERVICE_TASK_TEMPLATES.aircond;
  } else if (lower.includes('gantungan') || lower.includes('suspension') || lower.includes('absorber')) {
    template = SERVICE_TASK_TEMPLATES.suspension;
  } else if (lower.includes('tayar') || lower.includes('imbang') || lower.includes('balancing') || lower.includes('tyre')) {
    template = SERVICE_TASK_TEMPLATES.tyre;
  } else if (lower.includes('gear') || lower.includes('klac') || lower.includes('clutch') || lower.includes('transmisi')) {
    template = SERVICE_TASK_TEMPLATES.gearbox;
  } else if (lower.includes('elektrik') || lower.includes('bateri') || lower.includes('battery')) {
    template = SERVICE_TASK_TEMPLATES.electrical;
  } else {
    template = SERVICE_TASK_TEMPLATES.general;
  }

  const nowIso = new Date().toISOString();
  return template.map((title, idx) => ({
    id: `task-${idx + 1}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title,
    completed: isAllCompleted,
    completedAt: isAllCompleted ? nowIso : undefined,
  }));
}

export interface ProgressSummary {
  completedCount: number;
  totalCount: number;
  percent: number;
  isAllCompleted: boolean;
  activeTaskTitle?: string;
}

/**
 * Calculate progress percentage and status summary for any vehicle
 */
export function calculateServiceProgress(
  tasks?: ServiceTask[],
  status?: VehicleStatus
): ProgressSummary {
  // If explicitly completed or delivered and tasks are empty, treat as 100%
  if (status === 'completed' || status === 'delivered') {
    const total = tasks && tasks.length > 0 ? tasks.length : 1;
    const completed = tasks && tasks.length > 0 ? tasks.filter((t) => t.completed).length : 1;
    return {
      completedCount: completed || total,
      totalCount: total,
      percent: 100,
      isAllCompleted: true,
      activeTaskTitle: 'Semua Tugasan Selesai',
    };
  }

  if (!tasks || tasks.length === 0) {
    if (status === 'in_progress') {
      return {
        completedCount: 1,
        totalCount: 2,
        percent: 50,
        isAllCompleted: false,
        activeTaskTitle: 'Kerja Pembaikan Sedang Berjalan',
      };
    }
    return {
      completedCount: 0,
      totalCount: 0,
      percent: 0,
      isAllCompleted: false,
      activeTaskTitle: 'Menunggu Giliran Mula Kerja',
    };
  }

  const totalCount = tasks.length;
  const completedCount = tasks.filter((t) => t.completed).length;
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  // First incomplete task is active
  const activeTask = tasks.find((t) => !t.completed);

  return {
    completedCount,
    totalCount,
    percent,
    isAllCompleted,
    activeTaskTitle: activeTask ? activeTask.title : 'Semua Tugasan Selesai',
  };
}

/**
 * Toggle a task in the list
 */
export function toggleTaskInList(tasks: ServiceTask[], taskId: string): ServiceTask[] {
  const nowIso = new Date().toISOString();
  return tasks.map((t) => {
    if (t.id === taskId) {
      const nextCompleted = !t.completed;
      return {
        ...t,
        completed: nextCompleted,
        completedAt: nextCompleted ? nowIso : undefined,
      };
    }
    return t;
  });
}

/**
 * Add a new task to the list
 */
export function addTaskToList(tasks: ServiceTask[], title: string): ServiceTask[] {
  if (!title.trim()) return tasks;
  const newTask: ServiceTask = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    title: title.trim(),
    completed: false,
  };
  return [...tasks, newTask];
}

/**
 * Remove a task from the list
 */
export function deleteTaskFromList(tasks: ServiceTask[], taskId: string): ServiceTask[] {
  return tasks.filter((t) => t.id !== taskId);
}

/**
 * Returns dynamic color theme based on service completion percentage (0% to 100%)
 * Inspired by botanical artisan tones: terracotta rust (0%) -> antique ochre (50%) -> forest pine (100%)
 */
export function getProgressColorTheme(percent: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  
  if (clamped < 40) {
    // Terracotta Rust
    return {
      hue: 16,
      percent: clamped,
      badgeBg: 'linear-gradient(135deg, #c45c3d 0%, #ad4a2d 100%)',
      badgeBorder: 'rgba(255, 255, 255, 0.4)',
      badgeShadow: '0 4px 14px -1px rgba(180, 75, 45, 0.35)',
      badgeText: '#ffffff',
      accentColor: '#c45c3d',
      accentLight: 'rgba(196, 92, 61, 0.12)',
      accentBorder: 'rgba(196, 92, 61, 0.3)',
      textGlow: 'none',
      progressBarGradient: 'linear-gradient(90deg, #d9785c 0%, #c45c3d 100%)',
      progressBarGlow: '0 2px 8px rgba(196, 92, 61, 0.3)',
    };
  } else if (clamped < 80) {
    // Antique Ochre / Warm Gold
    return {
      hue: 38,
      percent: clamped,
      badgeBg: 'linear-gradient(135deg, #d4a354 0%, #be8c3a 100%)',
      badgeBorder: 'rgba(255, 255, 255, 0.4)',
      badgeShadow: '0 4px 14px -1px rgba(190, 140, 58, 0.35)',
      badgeText: '#ffffff',
      accentColor: '#be8c3a',
      accentLight: 'rgba(190, 140, 58, 0.12)',
      accentBorder: 'rgba(190, 140, 58, 0.3)',
      textGlow: 'none',
      progressBarGradient: 'linear-gradient(90deg, #c45c3d 0%, #d4a354 100%)',
      progressBarGlow: '0 2px 8px rgba(190, 140, 58, 0.3)',
    };
  } else {
    // Rich Botanical Forest Green
    return {
      hue: 155,
      percent: clamped,
      badgeBg: 'linear-gradient(135deg, #27614d 0%, #1c4b3b 100%)',
      badgeBorder: 'rgba(255, 255, 255, 0.4)',
      badgeShadow: '0 4px 14px -1px rgba(28, 75, 59, 0.35)',
      badgeText: '#ffffff',
      accentColor: '#27614d',
      accentLight: 'rgba(39, 97, 77, 0.12)',
      accentBorder: 'rgba(39, 97, 77, 0.3)',
      textGlow: 'none',
      progressBarGradient: 'linear-gradient(90deg, #d4a354 0%, #27614d 100%)',
      progressBarGlow: '0 2px 8px rgba(39, 97, 77, 0.3)',
    };
  }
}

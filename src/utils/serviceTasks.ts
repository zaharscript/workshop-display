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
 * Gradually transitions from vibrant workshop orange (hue ~26°) to bright emerald green (hue ~142°)
 */
export function getProgressColorTheme(percent: number) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  // 0% -> hue 26 (vibrant deep orange), 100% -> hue 142 (rich emerald green)
  const hue = Math.round(26 + (clamped / 100) * 116);
  // Saturation: 96% down to 86%
  const sat = Math.round(96 - (clamped / 100) * 10);
  // Lightness: 52% down to 48% (for crisp, high-contrast black text on solid badge)
  const light = Math.round(52 - (clamped / 100) * 4);

  return {
    hue,
    percent: clamped,
    badgeBg: `linear-gradient(145deg, hsl(${hue + 4}, ${sat}%, ${light + 3}%), hsl(${hue - 4}, ${sat}%, ${light - 4}%))`,
    badgeBorder: `hsla(${hue}, 100%, 75%, 0.65)`,
    badgeShadow: `0 8px 24px hsla(${hue}, 95%, 45%, 0.45)`,
    badgeText: '#000000',
    accentColor: `hsl(${hue}, 95%, 52%)`,
    accentLight: `hsla(${hue}, 95%, 52%, 0.16)`,
    accentBorder: `hsla(${hue}, 90%, 55%, 0.38)`,
    textGlow: `0 0 10px hsla(${hue}, 95%, 55%, 0.5)`,
    progressBarGradient: `linear-gradient(90deg, #ea580c 0%, hsl(${hue}, 95%, 50%) 100%)`,
    progressBarGlow: `0 0 14px hsla(${hue}, 95%, 50%, 0.6)`,
  };
}

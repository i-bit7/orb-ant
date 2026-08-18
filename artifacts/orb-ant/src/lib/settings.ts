export interface AntSettings {
  speedMultiplier: number;   // 0.3 – 3.0, default 1.0
  sizeMultiplier: number;    // 0.5 – 2.0, default 1.0
  awarenessRadius: number;   // 50 – 350,  default 180
  trailLength: number;       // 0 – 600,   default 600
}

export interface VisualSettings {
  showHUD: boolean;
  hudTitle: string;
  hudSubtitle: string;
  trailOpacity: number;      // 0 – 0.3, default 0.07
  antBrightness: number;     // 0 – 1,   default 1.0
}

export interface AppSettings {
  ant: AntSettings;
  visual: VisualSettings;
}

const STORAGE_KEY = 'orb-ant-settings';

export const DEFAULT_SETTINGS: AppSettings = {
  ant: {
    speedMultiplier: 1.0,
    sizeMultiplier: 1.0,
    awarenessRadius: 180,
    trailLength: 600,
  },
  visual: {
    showHUD: true,
    hudTitle: 'ORB ANT',
    hudSubtitle: 'an artificial creature',
    trailOpacity: 0.07,
    antBrightness: 1.0,
  },
};

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ant: { ...DEFAULT_SETTINGS.ant, ...parsed.ant },
      visual: { ...DEFAULT_SETTINGS.visual, ...parsed.visual },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  // Dispatch storage event so orb-ant canvas picks it up in same tab
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

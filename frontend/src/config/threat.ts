export type ThreatLevel = 'hostile' | 'unknown' | 'nominal' | 'friendly';

export interface ThreatMeta {
  level: ThreatLevel;
  label: string;
  color: string;
  borderColor: string;
  bgColor: string;
  shape: 'diamond' | 'quatrefoil' | 'rectangle' | 'square';
}

export const THREAT_CONFIG: Record<ThreatLevel, ThreatMeta> = {
  hostile: {
    level: 'hostile',
    label: 'HOSTILE',
    color: 'var(--threat-hostile, #ef4444)',
    borderColor: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    shape: 'diamond',
  },
  unknown: {
    level: 'unknown',
    label: 'UNKNOWN',
    color: 'var(--threat-unknown, #f59e0b)',
    borderColor: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    shape: 'quatrefoil',
  },
  nominal: {
    level: 'nominal',
    label: 'NOMINAL',
    color: 'var(--status-nominal, #10b981)',
    borderColor: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
    shape: 'square',
  },
  friendly: {
    level: 'friendly',
    label: 'FRIENDLY',
    color: 'var(--accent-blue, #38bdf8)',
    borderColor: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.15)',
    shape: 'rectangle',
  },
};

// Known class to threat level mapping
const CLASS_THREAT_MAP: Record<string, ThreatLevel> = {
  // AFV AI service detections
  'apc / recon vehicle': 'hostile',
  'military truck': 'hostile',
  'armored transport': 'hostile',
  'heavy rail asset': 'hostile',
  'aerial drone / aircraft': 'hostile',
  'naval patrol craft': 'hostile',
  'infantry target': 'hostile',
  'light recon scout': 'hostile',
  'tank': 'hostile',
  'artillery': 'hostile',
  'armored vehicle': 'hostile',
  'combat vehicle': 'hostile',
  'soldier': 'hostile',
  'weapon': 'hostile',
  'drone': 'hostile',

  // Nominal / civilian / base assets
  'civilian vehicle': 'nominal',
  'medical unit': 'nominal',
  'base station': 'nominal',
  'sensor tower': 'nominal',
  'checkpoint': 'nominal',

  // Friendly units
  'friendly afv': 'friendly',
  'operator unit': 'friendly',
  'allied recon': 'friendly',
  'allied force': 'friendly',
};

/**
 * Returns threat metadata for any target class name.
 * Defaults to 'unknown' if not explicitly mapped.
 */
export function getThreatForClass(className: string): ThreatMeta {
  if (!className) return THREAT_CONFIG.unknown;
  const normalized = className.trim().toLowerCase();
  
  // Exact match
  if (CLASS_THREAT_MAP[normalized]) {
    return THREAT_CONFIG[CLASS_THREAT_MAP[normalized]];
  }

  // Partial keyword check
  if (
    normalized.includes('hostile') ||
    normalized.includes('tank') ||
    normalized.includes('apc') ||
    normalized.includes('combat') ||
    normalized.includes('infantry') ||
    normalized.includes('target') ||
    normalized.includes('weapon')
  ) {
    return THREAT_CONFIG.hostile;
  }

  if (normalized.includes('friendly') || normalized.includes('allied')) {
    return THREAT_CONFIG.friendly;
  }

  if (normalized.includes('nominal') || normalized.includes('civilian') || normalized.includes('safe')) {
    return THREAT_CONFIG.nominal;
  }

  // Default to unknown yellow according to BRD specification
  return THREAT_CONFIG.unknown;
}

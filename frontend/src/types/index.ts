export interface DetectedObject {
  id?: number;
  className: string;
  confidence: number;
  boxXMin: number;
  boxYMin: number;
  boxXMax: number;
  boxYMax: number;
}

export type AnalysisStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface AnalysisRecord {
  id: string;
  userId?: string;
  status: AnalysisStatus;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath?: string;
  modelVersion?: string;
  processingTimeMs?: number;
  createdAt: string;
  updatedAt?: string;
  detectedObjects: DetectedObject[];
}

export interface AuthResponse {
  id?: number;
  token: string;
  type?: string;
  username: string;
  email: string;
  roles: string[];
}

export interface UserProfile {
  id?: number;
  username: string;
  email: string;
  roles: string[];
}

export interface ComponentHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  details?: string;
  lastChecked?: string;
}

export interface SystemHealthResponse {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  timestamp: string;
  components: {
    backend: ComponentHealth;
    database: ComponentHealth;
    aiService: ComponentHealth;
    storage: ComponentHealth;
  };
}

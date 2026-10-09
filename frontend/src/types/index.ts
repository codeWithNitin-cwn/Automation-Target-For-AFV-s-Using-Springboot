export interface DetectedObject {
  id?: number;
  className: string;
  confidence: number;
  boxXMin: number;
  boxYMin: number;
  boxXMax: number;
  boxYMax: number;
}

export interface AnalysisRecord {
  id: string;
  userId?: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
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
  token: string;
  type: string;
  username: string;
  email: string;
  roles: string[];
}

export interface UserProfile {
  username: string;
  email: string;
  roles: string[];
}

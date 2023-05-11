import { Types } from 'mongoose';
import { VisibilityState } from '../../../models';

export interface FileLink {
  /**
   * File ID
   */
  id: string;
  url: string;
  fileName?: string;
}

export interface FileWithSensorProblem {
  fileId: string;
  sensor: {
    sensorId: string;
    problem: string;
  };
}

export interface FileSetVisibilityStateParams {
  id: Types.ObjectId;
  isSyncing: boolean;
  visibilityState?: VisibilityState;
  storage?: { path?: string; bucket?: string };
  errorMessage?: string;
}

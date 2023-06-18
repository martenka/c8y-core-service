import { TaskMode } from '../../../../../models';

export interface TaskModeInfo {
  taskId: string;
}
export interface TaskModeMessage {
  type: TaskMode;
  tasks: TaskModeInfo[];
}

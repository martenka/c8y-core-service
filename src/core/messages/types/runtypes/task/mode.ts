import { Array, Record, Static, String } from 'runtypes';
import { TaskModeRuntype } from '../common';

const TaskModeInfo = Record({
  taskId: String,
});

export const TaskModeMessageRuntype = Record({
  type: TaskModeRuntype,
  tasks: Array(TaskModeInfo),
});

export type TaskModeMessage = Static<typeof TaskModeMessageRuntype>;

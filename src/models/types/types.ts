export type CustomAttributes = { [key: string]: string | CustomAttributes };

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}

export type TaskStatus = keyof typeof TaskSteps;
export const taskTypes = ['DataFetchTask', 'ObjectSyncTask'] as const;

export type Properties<T> = {
  [Key in keyof T]: T[Key];
};

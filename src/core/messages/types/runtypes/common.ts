import { Dictionary, Lazy, Literal, Static, String, Union } from 'runtypes';

export const ISOString = String.withConstraint((value) => {
  try {
    return new Date(value).toISOString() === value;
  } catch (e) {
    return false;
  }
});

export const StrictString = String.withConstraint(
  (value) => value.length !== 0,
);

export const CustomAttributesRuntype = Lazy(() =>
  Dictionary(String, String.Or(CustomAttributesRuntype)),
);

export const TaskStatusRuntype = Union(
  Literal('NOT_STARTED'),
  Literal('IN_QUEUE'),
  Literal('WAITING_NEXT_CYCLE'),
  Literal('PROCESSING'),
  Literal('DONE'),
  Literal('FAILED'),
  Literal('DISABLED'),
);
export const TaskModeRuntype = Union(Literal('ENABLED'), Literal('DISABLED'));
export const VisibilityStateRuntype = Union(
  Literal('PUBLIC'),
  Literal('PRIVATE'),
);
export const TaskTypesRuntype = Union(
  Literal('DATA_FETCH'),
  Literal('DATA_UPLOAD'),
  Literal('OBJECT_SYNC'),
);

export type TaskStatus = Static<typeof TaskStatusRuntype>;
export type TaskTypes = Static<typeof TaskTypesRuntype>;
export type TaskMode = Static<typeof TaskModeRuntype>;
export type VisibilityState = Static<typeof VisibilityStateRuntype>;
export type CustomAttributes = { [key: string]: string | CustomAttributes };
/**
 * Validates that input **taskType** matches TaskTypesRuntype. <br>
 * Throws ValidationError if given taskType doesn't match runtype
 */
export function validateTaskType(taskType: string): TaskTypes {
  return TaskTypesRuntype.check(taskType);
}

export function getTaskType(taskType: TaskTypes): TaskTypes {
  return taskType;
}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../Base';
import { HydratedDocument, Model, Types } from 'mongoose';
import { User } from '../User';
import { Properties } from '../../global/types/types';
import { runtypeFieldValidator, taskEntityConverter } from '../utils/utils';
import {
  TaskTypes,
  TaskTypesRuntype,
  TaskStatus,
  TaskStatusRuntype,
  TaskMode,
  TaskModeRuntype,
} from '../../core/messages/types/runtypes/common';

@Schema({ _id: false })
export class PeriodicData {
  @Prop({ required: true })
  pattern: string;

  @Prop()
  windowDurationSeconds?: number;
}

@Schema({ _id: false })
export class TaskMetadata {
  @Prop()
  lastRanAt?: Date;

  @Prop()
  lastScheduledAt?: Date;

  @Prop()
  lastCompletedAt?: Date;

  @Prop()
  lastFailedAt?: Date;

  @Prop()
  lastFailReason?: string;

  @Prop({ type: Date })
  firstRunAt?: Date;

  @Prop({ type: Date })
  nextRunAt?: Date;

  @Prop({ type: PeriodicData })
  periodicData?: PeriodicData;
}

@Schema({
  discriminatorKey: 'type',
  toJSON: {
    transform: taskEntityConverter,
  },
  toObject: {
    transform: taskEntityConverter,
  },
})
export class Task extends Base {
  @Prop({
    type: String,
    validate: runtypeFieldValidator(TaskTypesRuntype, 'TaskType'),
  })
  taskType: TaskTypes;

  @Prop()
  name: string;

  @Prop({
    required: true,
    default: 'NOT_STARTED' as TaskStatus,
    validate: runtypeFieldValidator(TaskStatusRuntype, 'TaskStatus'),
  })
  status: TaskStatus;

  @Prop({
    default: 'ENABLED' as TaskMode,
    validate: runtypeFieldValidator(TaskModeRuntype, 'TaskMode'),
  })
  mode: TaskMode;

  @Prop({ type: TaskMetadata, default: {} })
  metadata: TaskMetadata;

  @Prop({ type: Types.ObjectId, ref: () => User })
  initiatedByUser: Types.ObjectId;

  payload?: object;

  @Prop({
    type: Object,
    default: {},
    validate: {
      validator: (input) => typeof input === 'object',
      message: 'CustomAttributes must be of type object!',
    },
  })
  customAttributes: Record<string, unknown>;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
export type TaskModel = Model<Task>;
export type TaskDocument = HydratedDocument<Task>;

export type TaskType = Properties<Task>;
export type TaskPeriodicDataType = Properties<PeriodicData>;
export type TaskMetadataType = Properties<TaskMetadata>;

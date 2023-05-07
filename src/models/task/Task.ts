import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../Base';
import { notNil } from '../../utils/validation';
import { HydratedDocument, Model, Types } from 'mongoose';
import { User } from '../User';
import { Properties } from '../../global/types/types';
import { TaskStatus, TaskSteps, TaskTypes } from './types';
import { taskEntityConverter } from '../utils/utils';

@Schema({ _id: false })
export class PeriodicData {
  @Prop({ required: true })
  pattern: string;

  @Prop()
  fetchDurationSeconds?: number;
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

  @Prop({ type: PeriodicData })
  periodicData?: PeriodicData;
}

@Schema({
  discriminatorKey: 'taskType',
  toJSON: {
    transform: taskEntityConverter,
  },
  toObject: {
    transform: taskEntityConverter,
  },
})
export class Task extends Base {
  taskType: keyof typeof TaskTypes;

  @Prop()
  name: string;

  @Prop({
    required: true,
    enum: TaskSteps,
    default: TaskSteps.NOT_STARTED,
    validate: {
      validator: (input) =>
        notNil(input) && Object.values(TaskSteps).includes(input),
      message: (props) =>
        `${props?.value ?? 'UNKNOWN'} is not a valid status value!`,
    },
  })
  status: TaskStatus;

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

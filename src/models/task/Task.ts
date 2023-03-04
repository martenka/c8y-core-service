import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from '../Base';
import { notNil } from '../../utils/validation';
import { TaskStatus, TaskSteps, TaskTypes } from '../types/types';
import { HydratedDocument, Model, Types } from 'mongoose';
import { User } from '../User';
import { Properties } from '../../global/types/types';
@Schema({ _id: false })
export class PeriodicData {
  @Prop({ required: true })
  pattern: string;

  @Prop({ required: true })
  fetchDuration: number;

  @Prop({ type: Date })
  firstRunAt: Date;
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
  lastFailReason?: Date;

  @Prop({ type: PeriodicData })
  periodicData?: PeriodicData;
}

@Schema({
  discriminatorKey: 'taskType',
  toJSON: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
    },
  },
  toObject: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
    },
  },
})
export class Task extends Base {
  taskType: keyof typeof TaskTypes;

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

  @Prop({ type: TaskMetadata })
  metadata: TaskMetadata;

  @Prop({ type: Types.ObjectId, ref: () => User })
  initiatedByUser?: string;

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
export type TaskType = Properties<Task>;
export type TaskModel = Model<Task>;
export type TaskDocument = HydratedDocument<Task>;

import { Base } from './Base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument, Model, Types } from 'mongoose';
import { notNil } from '../utils/validation';
import { Sensor } from './Sensor';

export enum TaskSteps {
  NOT_STARTED = 'NOT_STARTED',
  IN_QUEUE = 'IN_QUEUE',
  PROCESSING = 'PROCESSING',
  DONE = 'DONE',
  FAILED = 'FAILED',
}
export type TaskStatus = keyof typeof TaskSteps;

@Schema({
  _id: false,
  toJSON: {
    transform: (doc, ret) => {
      if (notNil(ret?.sensor)) ret.sensor = ret.sensor.toString();
    },
  },
  toObject: {
    transform: (doc, ret) => {
      if (notNil(ret?.sensor) && ret.sensor instanceof Types.ObjectId)
        ret.sensor = ret.sensor.toString();
    },
  },
})
class SensorData extends Document {
  @Prop({ type: Types.ObjectId, ref: () => Sensor })
  sensor: Sensor;

  @Prop()
  fileName?: string;

  @Prop()
  bucket?: string;

  @Prop()
  filePath?: string;

  @Prop()
  fileURL?: string;
}

export const SensorWithFileNameSchema =
  SchemaFactory.createForClass(SensorData);

@Schema({
  _id: false,
  toJSON: {
    transform: (doc, ret) => {
      if (notNil(ret.groupId)) ret.groupId = ret.groupId.toString();
    },
  },
  toObject: {
    transform: (doc, ret) => {
      if (notNil(ret.groupId)) ret.groupId = ret.groupId.toString();
    },
  },
})
class FileTaskData extends Document {
  @Prop({ type: [SensorWithFileNameSchema], default: [] })
  sensorData: SensorData[];

  @Prop({ required: true, type: Date })
  dateFrom: Date;

  @Prop({ required: true, type: Date })
  dateTo: Date;

  @Prop({ type: Types.ObjectId })
  groupId?: Types.ObjectId;
}

@Schema({
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
export class FileTask extends Base {
  @Prop({ default: `FileTask-${new Date().getTime()}` })
  name?: string;

  @Prop({
    default: 'SensorData',
  })
  type?: string;

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

  @Prop({ type: FileTaskData, required: true })
  data: FileTaskData;

  @Prop({
    type: Object,
    default: {},
    validate: {
      validator: (input) => typeof input === 'object',
      message: 'FileTask customAttributes must be of type object!',
    },
  })
  customAttributes: Record<string, unknown>;

  @Prop()
  lastRanAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  failedAt?: Date;

  @Prop()
  failReason: string;
}

export const FileTaskSchema = SchemaFactory.createForClass(FileTask);
export type FileTaskDocument = HydratedDocument<FileTask>;
export type FileTaskModel = Model<FileTask>;

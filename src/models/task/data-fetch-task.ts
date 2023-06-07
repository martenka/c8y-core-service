import { Task } from './Task';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { notNil } from '../../utils/validation';
import { Sensor } from '../Sensor';
import { Group } from '../Group';
import { Properties } from '../../global/types/types';
import { TaskTypes } from './types';
import { taskEntityConverter } from '../utils/utils';

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
class SensorData {
  @Prop({ type: Types.ObjectId, ref: () => Sensor })
  sensor: Sensor | Types.ObjectId;

  /**
   * Random ID to differentiate between existing and incoming new files from messages
   */
  @Prop({ required: true })
  dataId: string;

  @Prop()
  fileId?: string;

  @Prop()
  fileName?: string;

  @Prop()
  bucket?: string;

  @Prop()
  filePath?: string;

  @Prop()
  fileURL?: string;
}

const SensorDataSchema = SchemaFactory.createForClass(SensorData);

@Schema({
  _id: false,
  toJSON: {
    transform: (doc, ret) => {
      if (ret?.group instanceof Types.ObjectId) {
        ret.group = ret.group.toString();
      }
    },
  },
  toObject: {
    transform: (doc, ret) => {
      if (ret?.group instanceof Types.ObjectId) {
        ret.group = ret.group.toString();
      }
    },
  },
})
export class DataFetchPayload {
  @Prop({ type: [SensorDataSchema], default: [] })
  data: SensorData[];

  @Prop({ type: Date })
  dateFrom?: Date;

  @Prop({ type: Date })
  dateTo?: Date;

  @Prop({ type: Types.ObjectId, ref: () => Group })
  group?: Group | Types.ObjectId;
}

const DataFetchPayloadSchema = SchemaFactory.createForClass(DataFetchPayload);

@Schema({
  toJSON: {
    transform: taskEntityConverter,
  },
  toObject: {
    transform: taskEntityConverter,
  },
})
export class DataFetchTask extends Task {
  @Prop({ default: TaskTypes.DATA_FETCH })
  taskType: TaskTypes.DATA_FETCH = TaskTypes.DATA_FETCH;

  @Prop({ default: `DataFetch-${new Date().getTime()}`, index: true })
  name: string;

  @Prop({ type: DataFetchPayloadSchema, required: true })
  payload: DataFetchPayload;
}

export const DataFetchTaskSchema = SchemaFactory.createForClass(DataFetchTask);

export type DataFetchTaskDocument = HydratedDocument<DataFetchTask>;
export type DataFetchTaskModel = Model<DataFetchTask>;

export type DataFetchTaskType = Properties<DataFetchTask>;
export type DataFetchPayloadType = Properties<DataFetchPayload>;
export type SensorDataType = Properties<SensorData>;

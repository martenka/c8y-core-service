import { Task } from './Task';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';
import { notNil } from '../../utils/validation';
import { Sensor } from '../Sensor';
import { Group } from '../Group';
import { Properties } from '../../global/types/types';
import { TaskTypes } from './types';

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
})
export class DataFetchPayload {
  @Prop({ type: [SensorDataSchema], default: [] })
  data: SensorData[];

  @Prop({ required: true, type: Date })
  dateFrom: Date;

  @Prop({ required: true, type: Date })
  dateTo: Date;

  @Prop({ type: Types.ObjectId, ref: () => Group })
  group?: Group | Types.ObjectId;
}

@Schema()
export class DataFetchTask extends Task {
  taskType: TaskTypes.DATA_FETCH;

  @Prop({ default: `DataFetch-${new Date().getTime()}`, index: true })
  name: string;

  @Prop({ type: DataFetchPayload, required: true })
  payload: DataFetchPayload;
}

export const DataFetchTaskSchema = SchemaFactory.createForClass(DataFetchTask);

export type DataFetchTaskDocument = HydratedDocument<DataFetchTask>;
export type DataFetchTaskModel = Model<DataFetchTask>;
export type DataFetchTaskType = Properties<DataFetchTask>;

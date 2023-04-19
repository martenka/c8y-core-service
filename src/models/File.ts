import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './Base';
import { HydratedDocument, Model, Types } from 'mongoose';
import { Properties } from '../global/types/types';
import { Sensor } from './Sensor';
import { CustomAttributes } from './types/types';
import { DataFetchTask, DataFetchTaskType } from './task/data-fetch-task';
import { isEmpty } from '@nestjs/common/utils/shared.utils';

@Schema({ _id: false })
export class FileStorageInfo {
  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  path: string;

  @Prop()
  url?: string;
}

@Schema()
export class FileVisibilityState {
  @Prop({ default: false })
  published: boolean;

  @Prop({ default: false })
  stateChanging: boolean;

  @Prop()
  errorMessage?: string;
}

@Schema({ _id: false })
export class FileValueFragment {
  @Prop({ required: true })
  type: string;

  @Prop()
  description?: string;
}

@Schema({
  _id: false,
  toJSON: {
    transform: (doc, ret) => {
      try {
        if (
          Array.isArray(ret?.sensors) &&
          (isEmpty(ret.sensors) || ret[0] instanceof Types.ObjectId)
        ) {
          ret.sensors = ret.sensors.map((sensor) => sensor.toString());
        }
      } catch (e) {}
    },
  },
  toObject: {
    transform: (doc, ret) => {
      try {
        if (
          Array.isArray(ret?.sensors) &&
          (isEmpty(ret.sensors) || ret[0] instanceof Types.ObjectId)
        ) {
          ret.sensors = ret.sensors.map((sensor) => sensor.toString());
        }
      } catch (e) {}
    },
  },
})
export class FileMetadata {
  @Prop({ type: [Types.ObjectId], ref: () => Sensor, default: [] })
  sensors?: Types.DocumentArray<Sensor> | Types.ObjectId[];

  @Prop({ type: Date })
  fromDate?: Date;

  @Prop({ type: Date })
  toDate?: Date;

  @Prop()
  managedObjectId?: string;

  @Prop()
  managedObjectName?: string;

  @Prop({ type: () => Date })
  dateFrom: Date;

  @Prop({ type: () => Date })
  dateTo: Date;

  @Prop({ type: () => [FileValueFragment], default: [] })
  valueFragments?: FileValueFragment[];
}

@Schema({
  toJSON: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
      if (ret?.createdByTask instanceof Types.ObjectId) {
        ret.createdByTask = ret.createdByTask.toString();
      }
    },
  },
  toObject: {
    transform: (doc, ret) => {
      ret._id = ret._id.toString();
      if (ret?.createdByTask instanceof Types.ObjectId) {
        ret.createdByTask = ret.createdByTask.toString();
      }
    },
  },
})
export class File extends Base {
  @Prop({ required: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: () => DataFetchTask })
  createdByTask: Types.ObjectId | DataFetchTaskType | undefined;

  @Prop()
  url?: string;

  @Prop()
  description?: string;

  @Prop({ type: FileStorageInfo, required: true })
  storage: FileStorageInfo;

  @Prop({ type: FileMetadata, default: {} })
  metadata?: FileMetadata;

  @Prop({ type: FileVisibilityState, default: {} })
  visibilityState: FileVisibilityState;

  @Prop({
    type: Object,
    default: {},
    validate: {
      validator: function (value) {
        return typeof value === 'object';
      },
      message: 'CustomAttributes have to be of type object!',
    },
  })
  customAttributes: CustomAttributes;
}

export const FileSchema = SchemaFactory.createForClass(File);
export type FileDocument = HydratedDocument<File>;
export type FileModel = Model<File>;

export type FileProperties = Properties<File>;
export type FileStorageProperties = Properties<FileStorageInfo>;
export type FileMetadataProperties = Properties<FileMetadata>;
export type FileValueFragmentProperties = Properties<FileValueFragment>;

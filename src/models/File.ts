import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './Base';
import { HydratedDocument, Model, Types } from 'mongoose';
import { Properties } from '../global/types/types';
import { Sensor } from './Sensor';
import { CustomAttributes } from './types/types';
import { DataFetchTask, DataFetchTaskType } from './task/data-fetch-task';
import { Platform } from '../global/tokens';
import { isPresent } from '../utils/validation';
import { PlatformIdentifiersRuntype } from '../core/messages/types/runtypes/task/data-upload';

@Schema({ _id: false })
export class FileStorageInfo {
  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  path: string;

  @Prop()
  url?: string;
}

const FileStorageInfoSchema = SchemaFactory.createForClass(FileStorageInfo);

@Schema({ _id: false })
export class FileVisibilityState {
  @Prop({ default: false })
  published: boolean;

  @Prop({ default: false })
  stateChanging: boolean;

  @Prop()
  errorMessage?: string;

  @Prop({
    type: [String],
    default: [],
    validate: {
      validator: (input) => {
        return (
          isPresent(input) &&
          Array.isArray(input) &&
          input.every((value) => PlatformIdentifiersRuntype.guard(value))
        );
      },
      message: (props) =>
        `${props?.value ?? 'UNKNOWN'} is not a valid platform!`,
    },
  })
  exposedToPlatforms: Platform[];
}

@Schema({ _id: false })
export class FileValueFragment {
  @Prop({ required: true })
  type: string;

  @Prop()
  description?: string;
}

export const FileValueFragmentSchema =
  SchemaFactory.createForClass(FileValueFragment);

@Schema({
  _id: false,
  toJSON: {
    transform: (doc, ret) => {
      try {
        if (Array.isArray(ret?.sensors)) {
          ret.sensors = ret.sensors.map((sensor) => sensor.toString());
        }
      } catch (e) {}
    },
  },
  toObject: {
    transform: (doc, ret) => {
      try {
        if (Array.isArray(ret?.sensors)) {
          ret.sensors = ret.sensors.map((sensor) => sensor.toString());
        }
      } catch (e) {}
    },
  },
})
export class FileMetadata {
  @Prop({ type: [Types.ObjectId], ref: () => Sensor, default: [] })
  sensors?: Types.DocumentArray<Sensor> | Types.ObjectId[];

  @Prop()
  managedObjectId?: string;

  @Prop()
  managedObjectName?: string;

  @Prop({ type: () => Date })
  dateFrom: Date;

  @Prop({ type: () => Date })
  dateTo: Date;

  @Prop({ type: [FileValueFragmentSchema], default: [] })
  valueFragments?: FileValueFragment[];
}

const FileMetadataSchema = SchemaFactory.createForClass(FileMetadata);

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

  @Prop({ type: FileStorageInfoSchema, required: true })
  storage: FileStorageInfo;

  @Prop({ type: FileMetadataSchema, default: {} })
  metadata: FileMetadata;

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

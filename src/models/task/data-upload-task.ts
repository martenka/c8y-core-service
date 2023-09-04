import { Task } from './Task';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { CustomAttributes } from '../types/types';
import { HydratedDocument, Model, Types } from 'mongoose';
import { Properties } from '../../global/types/types';
import { runtypeFieldValidator, taskEntityConverter } from '../utils/utils';
import {
  TaskTypes,
  TaskTypesRuntype,
} from '../../core/messages/types/runtypes/common';
import {
  AllowedPlatformIdentifiers,
  PlatformIdentifiersRuntype,
} from '../../core/messages/types/runtypes/task/data-upload';
@Schema({ _id: false })
export class DataUploadFileStorage {
  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  path: string;
}

@Schema({ _id: false })
export class DataUploadFileMetadata {
  @Prop({ type: Date, required: true })
  dateFrom: Date;

  @Prop({ type: Date, required: true })
  dateTo: Date;

  @Prop({ required: true })
  managedObjectId: string;

  @Prop()
  managedObjectName?: string;

  @Prop({ required: true })
  valueFragmentType: string;

  @Prop()
  valueFragmentDescription?: string;

  @Prop()
  type?: string;

  @Prop()
  sensorDescription?: string;

  @Prop()
  fileDescription?: string;
}

@Schema({
  _id: false,
  toJSON: {
    transform: (doc, ret) => {
      ret.fileId = ret.fileId?.toString();
    },
  },
  toObject: {
    transform: (doc, ret) => {
      ret.fileId = ret.fileId?.toString();
    },
  },
})
export class DataUploadFile {
  @Prop({ type: Types.ObjectId, required: true })
  fileId: Types.ObjectId;

  @Prop({ required: true })
  fileName: string;

  @Prop({ type: () => DataUploadFileStorage, required: true })
  storage: DataUploadFileStorage;

  @Prop({ type: () => DataUploadFileMetadata, required: true })
  metadata: DataUploadFileMetadata;

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

const DataUploadFileSchema = SchemaFactory.createForClass(DataUploadFile);

@Schema({ _id: false })
export class DataUploadPlatform {
  @Prop({
    required: true,
    validate: runtypeFieldValidator(
      PlatformIdentifiersRuntype,
      'platformIdentifier',
    ),
  })
  platformIdentifier: AllowedPlatformIdentifiers;
}

@Schema({ _id: false })
export class DataUploadPayload {
  @Prop({ type: [DataUploadFileSchema], required: true })
  files: DataUploadFile[];

  @Prop({ type: DataUploadPlatform, required: true })
  platform: DataUploadPlatform;
}

@Schema({
  toJSON: {
    transform: taskEntityConverter,
  },
  toObject: {
    transform: taskEntityConverter,
  },
})
export class DataUploadTask extends Task {
  @Prop({
    type: String,
    default: 'DATA_UPLOAD' as TaskTypes,
    validate: runtypeFieldValidator(
      TaskTypesRuntype.alternatives[1],
      'TaskType',
    ),
  })
  taskType: TaskTypes = 'DATA_UPLOAD';

  @Prop({ default: `DataUpload-${new Date().getTime()}`, index: true })
  name: string;

  @Prop({ type: DataUploadPayload, required: true })
  payload: DataUploadPayload;
}

export const DataUploadTaskSchema =
  SchemaFactory.createForClass(DataUploadTask);

export type DataUploadTaskDocument = HydratedDocument<DataUploadTask>;
export type DataUploadTaskModel = Model<DataUploadTask>;
export type DataUploadTaskType = Properties<DataUploadTask>;
export type DataUploadTaskPayloadProperties = Properties<DataUploadPayload>;
export type DataUploadTaskFileMetadataProperties =
  Properties<DataUploadFileMetadata>;

export type DataUploadTaskFileProperties = Properties<DataUploadFile>;

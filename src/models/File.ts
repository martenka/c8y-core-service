import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base } from './Base';
import { HydratedDocument, Model, Types } from 'mongoose';
import { Properties } from '../global/types/types';
import { Sensor } from './Sensor';
import { CustomAttributes } from './types/types';

@Schema({ _id: false })
export class FileStorageInfo {
  @Prop({ required: true })
  bucket: string;

  @Prop({ required: true })
  path: string;

  @Prop()
  url?: string;
}

@Schema({ _id: false })
export class FileValueFragment {
  @Prop({ required: true })
  type: string;

  @Prop()
  description?: string;
}

@Schema({ _id: false })
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

  @Prop({ type: () => [FileValueFragment], default: [] })
  valueFragments?: FileValueFragment[];
}

@Schema()
export class File extends Base {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: FileStorageInfo, required: true })
  storage: FileStorageInfo;

  @Prop({ type: FileMetadata })
  metadata?: FileMetadata;

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

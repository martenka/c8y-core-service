import { Base } from './Base';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { CustomAttributes } from './types/types';
import { Properties } from '../global/types/types';

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
export class Sensor extends Base {
  @Prop({ required: true })
  managedObjectId: string;

  @Prop({ required: true })
  managedObjectName: string;

  @Prop()
  valueFragmentType: string;

  @Prop()
  valueFragmentDisplayName: string;

  @Prop()
  owner?: string;

  @Prop()
  type?: string;

  @Prop()
  description?: string;

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

export const SensorSchema = SchemaFactory.createForClass(Sensor);

export type SensorDocument = HydratedDocument<Sensor>;
export type SensorModel = Model<SensorDocument>;
export type SensorType = Properties<Sensor>;

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Base, Sensor } from './index';
import { Types } from 'mongoose';
import { CustomAttributes } from './types/types';
import { HydratedDocument, Model } from 'mongoose';
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
export class Group extends Base {
  @Prop({ required: true })
  name: string;

  @Prop()
  managedObjectId?: string;

  @Prop()
  owner?: string;

  @Prop({ type: [Types.ObjectId], ref: () => Sensor, default: [] })
  groups: Types.DocumentArray<Group>;

  @Prop({ type: [Types.ObjectId], ref: () => Sensor })
  sensors: Types.DocumentArray<Sensor>;

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

export const GroupSchema = SchemaFactory.createForClass(Group);

export type GroupDocument = HydratedDocument<Group>;
export type GroupModel = Model<Group>;

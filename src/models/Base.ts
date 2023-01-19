import { Prop, Schema } from '@nestjs/mongoose';
import { Types } from 'mongoose';

@Schema()
export abstract class Base {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ default: undefined })
  deletedAt?: Date;

  @Prop({ default: Date.now })
  updatedAt?: Date;
}

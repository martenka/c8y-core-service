import { Task } from './Task';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { Properties } from '../../global/types/types';
import { TaskTypes } from './types';
import { taskEntityConverter } from '../utils/utils';

@Schema({
  toJSON: {
    transform: taskEntityConverter,
  },
  toObject: {
    transform: taskEntityConverter,
  },
})
export class ObjectSyncTask extends Task {
  taskType: TaskTypes.OBJECT_SYNC;

  @Prop({ default: `ObjectSync-${new Date().getTime()}`, index: true })
  name: string;
}

export const ObjectSyncTaskSchema =
  SchemaFactory.createForClass(ObjectSyncTask);

export type ObjectSyncTaskDocument = HydratedDocument<ObjectSyncTask>;
export type ObjectSyncTaskModel = Model<ObjectSyncTask>;
export type ObjectSyncTaskType = Properties<ObjectSyncTask>;

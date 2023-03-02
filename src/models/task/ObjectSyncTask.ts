import { Task } from './Task';
import { Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model } from 'mongoose';
import { Properties } from '../types/types';

@Schema()
export class ObjectSyncTask extends Task {
  taskType: 'ObjectSyncTask';
}

export const ObjectSyncTaskSchema =
  SchemaFactory.createForClass(ObjectSyncTask);

export type ObjectSyncTaskDocument = HydratedDocument<ObjectSyncTask>;
export type ObjectSyncTaskModel = Model<ObjectSyncTask>;
export type ObjectSyncTaskType = Properties<ObjectSyncTask>;

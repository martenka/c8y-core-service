import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { PagingModule } from '../paging/paging.module';
import { MessagesModule } from '../messages/messages.module';
import { GroupsModule } from '../groups/groups.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  DataFetchTaskSchema,
  ObjectSyncTaskSchema,
  Task,
  TaskSchema,
  TaskTypes,
} from '../../models';

@Module({
  imports: [
    PagingModule,
    MessagesModule,
    GroupsModule,
    MongooseModule.forFeature([
      {
        name: Task.name,
        schema: TaskSchema,
        discriminators: [
          { name: TaskTypes.DATA_FETCH, schema: DataFetchTaskSchema },
          { name: TaskTypes.OBJECT_SYNC, schema: ObjectSyncTaskSchema },
        ],
      },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}

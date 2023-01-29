import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MessagesModule } from '../messages/messages.module';
import { MongooseModule } from '@nestjs/mongoose';
import { FileTask, TaskSchema } from '../../models/FileTask';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    MongooseModule.forFeature([{ name: FileTask.name, schema: TaskSchema }]),
    GroupsModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [MongooseModule],
})
export class FilesModule {}

import { forwardRef, Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { File, FileSchema } from '../../models';
import { SensorsModule } from '../sensors/sensors.module';
import { PagingModule } from '../paging/paging.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    forwardRef(() => MessagesModule),
    PagingModule,
    SensorsModule,
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

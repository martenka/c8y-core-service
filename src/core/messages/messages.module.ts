import { forwardRef, Module } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { MessagesController } from './messages-consumer.controller';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MessagesHandlerService } from './messages-handler.service';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { TasksModule } from '../tasks/tasks.module';
import { FilesModule } from '../files/files.module';
import { SensorsModule } from '../sensors/sensors.module';
import { ObjectSyncTaskMessageHandler } from './handlers/object-sync-task-message.handler';
import { GroupsModule } from '../groups/groups.module';

@Module({
  imports: [
    forwardRef(() => FilesModule),
    SensorsModule,
    GroupsModule,
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      useFactory: (config: ApplicationConfigService) => config.messagingConfig,
      inject: [ApplicationConfigService],
    }),
    forwardRef(() => TasksModule),
  ],
  controllers: [MessagesController],
  providers: [
    ObjectSyncTaskMessageHandler,
    MessagesProducerService,
    MessagesHandlerService,
  ],
  exports: [MessagesProducerService, RabbitMQModule],
})
export class MessagesModule {}

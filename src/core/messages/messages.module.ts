import { forwardRef, Module } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { MessagesController } from './messages-consumer.controller';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MessagesHandlerService } from './messages-handler.service';
import { FilesModule } from '../files/files.module';
import { ApplicationConfigService } from '../application-config/application-config.service';

@Module({
  imports: [
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      useFactory: (config: ApplicationConfigService) => config.messagingConfig,
      inject: [ApplicationConfigService],
    }),
    forwardRef(() => FilesModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesProducerService, MessagesHandlerService],
  exports: [MessagesProducerService, RabbitMQModule],
})
export class MessagesModule {}

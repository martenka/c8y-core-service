import { forwardRef, Module } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { MessagesController } from './messages-consumer.controller';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ExchangeTypes } from './types/exchanges';
import { MessagesHandlerService } from './messages-handler.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [
    RabbitMQModule.forRoot(RabbitMQModule, {
      exchanges: [
        {
          name: ExchangeTypes.FILE,
          type: 'direct',
          createExchangeIfNotExists: true,
        },
      ],
      uri: `amqp://${'guest'}:${'guest'}@localhost:5672`,
      prefetchCount: 1,
      enableControllerDiscovery: true,
      connectionInitOptions: {
        wait: true,
      },
    }),
    forwardRef(() => FilesModule),
  ],
  controllers: [MessagesController],
  providers: [MessagesProducerService, MessagesHandlerService],
  exports: [MessagesProducerService],
})
export class MessagesModule {}

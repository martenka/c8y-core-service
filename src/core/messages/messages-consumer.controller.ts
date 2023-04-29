import { Controller } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { ExchangeTypes } from './types/exchanges';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MessagesHandlerService } from './messages-handler.service';
import { TaskStatusMessage } from './types/message-types/task/types';
import { NoAuthRoute } from '../../decorators/authentication';
import { ConsumeMessage } from 'amqplib';
import { VisibilityStateResultMessage } from './types/message-types/file/types';

@Controller()
@NoAuthRoute()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesProducerService,
    private readonly messageHandlerService: MessagesHandlerService,
  ) {}

  @RabbitSubscribe({
    exchange: ExchangeTypes.GENERAL,
    queue: 'coreservice.tasks.status',
    routingKey: 'task.status.#',
    createQueueIfNotExists: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
      console.log('---------');
      console.error(msg);
      console.log('----------');
      console.error(channel);
    },
  })
  async consumeTaskStatusMessage(message: TaskStatusMessage) {
    await this.messageHandlerService.handleTaskStatusMessage(message);
  }

  @RabbitSubscribe({
    exchange: ExchangeTypes.GENERAL,
    queue: 'coreservice.files.result',
    routingKey: 'file.result.#',
    createQueueIfNotExists: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
      console.log('---------');
      console.error(msg);
      console.log('----------');
      console.error(channel);
    },
  })
  async consumeFileResultMessage(message: object, amqpMsg: ConsumeMessage) {
    switch (amqpMsg.fields.routingKey) {
      case 'file.result.visibility.state': {
        await this.messageHandlerService.handleFileVisibilityStateResultMessage(
          message as VisibilityStateResultMessage,
        );
      }
    }
  }
}

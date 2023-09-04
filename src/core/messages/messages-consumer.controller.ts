import { Controller } from '@nestjs/common';
import { ExchangeTypes } from './types/exchanges';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { MessagesHandlerService } from './messages-handler.service';
import { NoAuthRoute } from '../../decorators/authentication';
import { ConsumeMessage } from 'amqplib';
import { isPresent, messageValidator } from '../../utils/validation';
import { MessageMap, MessagesValidationMap } from './types/runtypes/map';

@Controller()
@NoAuthRoute()
export class MessagesController {
  constructor(private readonly messageHandlerService: MessagesHandlerService) {}

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
  async consumeTaskStatusMessage(payload: object, amqpMsg: ConsumeMessage) {
    const timestampEnhancer = async <T extends { timestamp?: string }>(
      message: T,
      callback: (updatedMessage: T) => Promise<void>,
    ) => {
      const timestamp = amqpMsg.properties.timestamp;
      const updatedMessage = {
        ...message,
        timestamp: typeof timestamp === 'string' ? timestamp : undefined,
      };
      if (typeof timestamp === 'string' && isPresent(message.timestamp)) {
        updatedMessage.timestamp = timestamp;
      }

      await callback(updatedMessage);
    };

    const handleMessage = async (message: MessageMap['taskStatusMessage']) => {
      await timestampEnhancer(message, (updatedMessage) =>
        this.messageHandlerService.handleTaskStatusMessage(updatedMessage),
      );
    };

    const handleFailedMessage = async (
      message: MessageMap['task.status.failed'],
    ) => {
      await timestampEnhancer(message, (updatedMessage) =>
        this.messageHandlerService.handleTaskFailedMessage(updatedMessage),
      );
    };

    const handleGeneralTaskStatusMessage = async (
      message: MessageMap['task.status'],
    ) => {
      await timestampEnhancer(message, (updatedMessage) =>
        this.messageHandlerService.handleGeneralTaskStatusMessage(
          updatedMessage,
        ),
      );
    };

    await messageValidator(payload, amqpMsg, MessagesValidationMap, {
      'task.status.object_sync': (message) => handleMessage(message),
      'task.status.data_fetch.result': (message) => handleMessage(message),
      'task.status.data_upload.result': (message) => handleMessage(message),
      'task.status.object_sync.result': (message) => handleMessage(message),
      'task.status.failed': (message) => handleFailedMessage(message),
      'task.status': (message) => handleGeneralTaskStatusMessage(message),
    });
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
  async consumeFileResultMessage(payload: object, amqpMsg: ConsumeMessage) {
    await messageValidator(payload, amqpMsg, MessagesValidationMap, {
      'file.result.visibility.state': (message) =>
        this.messageHandlerService.handleFileVisibilityStateResultMessage(
          message,
        ),
    });
  }
  @RabbitSubscribe({
    exchange: ExchangeTypes.GENERAL,
    queue: 'coreservice.tasks.mode.changed',
    routingKey: 'task.mode.changed',
    createQueueIfNotExists: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
    },
  })
  async consumeTaskModeChangedMessage(
    payload: object,
    amqpMsg: ConsumeMessage,
  ) {
    await messageValidator(payload, amqpMsg, MessagesValidationMap, {
      'task.mode.changed': (message) =>
        this.messageHandlerService.handleTaskModeChangedMessage(message),
    });
  }
}

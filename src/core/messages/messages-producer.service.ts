import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { Options } from 'amqplib';
import { MessageMap, MessagesValidationMap } from './types/runtypes/map';
import { Exchanges } from './types/runtypes/exchanges';
import { notPresent } from '../../utils/validation';
import { exhaustiveCheck } from '../../utils/helpers';

@Injectable()
export class MessagesProducerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  /**
   * Publishes input message into RabbitMQ exchange
   */
  publishMessage<K extends keyof MessageMap, V extends MessageMap[K]>(
    exchange: Exchanges,
    routingKey: K,
    message: V,
    options?: Options.Publish,
  ) {
    this.amqpConnection.publish(exchange, routingKey, message, options);
  }

  /**
   * Validates input message structure at runtime before sending it to RabbitMQ
   */
  sendMessage<
    K extends keyof Omit<
      MessageMap,
      'taskSchedulingMessage' | 'taskStatusMessage'
    >,
    V extends MessageMap[K],
  >(exchange: Exchanges, routingKey: K, message: V, options?: Options.Publish) {
    const validationType = MessagesValidationMap[routingKey];

    if (notPresent(validationType)) {
      throw new Error(
        `Validation type not present for message key: ${routingKey}`,
      );
    }
    validationType.message.check(message);

    const amqpOptions: Options.Publish = {
      timestamp: new Date().getTime(),
      ...options,
    };
    this.publishMessage(exchange, routingKey, message, amqpOptions);
  }

  sendTaskScheduledMessage(message: MessageMap['taskSchedulingMessage']) {
    switch (message.taskType) {
      case 'DATA_FETCH':
        this.sendMessage('General', 'task.scheduled.data_fetch', message);
        return;
      case 'DATA_UPLOAD':
        this.sendMessage('General', 'task.scheduled.data_upload', message);
        return;
      case 'OBJECT_SYNC':
        this.sendMessage('General', 'task.scheduled.object_sync', message);
        return;
      default:
        exhaustiveCheck(message['taskType'], 'sendTaskScheduledMessage');
    }
  }

  sendUserMessage(message: MessageMap['user.user']) {
    this.sendMessage('General', 'user.user', message);
  }

  sendFilesDeletionMessage(message: MessageMap['file.status.deletion']) {
    this.sendMessage('General', 'file.status.deletion', message);
  }

  sendFileVisibilityStateMessage(
    message: MessageMap['file.status.visibility.state'],
  ) {
    this.sendMessage('General', 'file.status.visibility.state', message);
  }

  sendTaskModeUpdateMessage(message: MessageMap['task.mode']) {
    this.sendMessage('General', 'task.mode', message);
  }
}

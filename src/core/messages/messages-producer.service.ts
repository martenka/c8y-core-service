import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MessageTypes } from './types/message-types/messageTypes';
import { ExchangeTypes } from './types/exchanges';
import { Options } from 'amqplib';

@Injectable()
export class MessagesProducerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  private sendMessage<K extends keyof MessageTypes>(
    exchange: ExchangeTypes,
    routingKey: K,
    message: MessageTypes[K],
    options?: Options.Publish,
  ) {
    const amqpOptions: Options.Publish = {
      timestamp: new Date().getTime(),
      ...options,
    };

    this.amqpConnection.publish(exchange, routingKey, message, amqpOptions);
  }

  sendTaskScheduledMessage(message: MessageTypes['task.scheduled']) {
    this.sendMessage(ExchangeTypes.GENERAL, 'task.scheduled', message);
  }

  sendUserMessage(message: MessageTypes['user.user']) {
    this.sendMessage(ExchangeTypes.GENERAL, 'user.user', message);
  }

  sendFilesDeletionMessage(message: MessageTypes['file.status.deletion']) {
    this.sendMessage(ExchangeTypes.GENERAL, 'file.status.deletion', message);
  }

  sendFileVisibilityStateMessage(
    message: MessageTypes['file.status.visibility.state'],
  ) {
    this.sendMessage(
      ExchangeTypes.GENERAL,
      'file.status.visibility.state',
      message,
    );
  }
}

import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { MessageTypes } from './types/message-types/messageTypes';
import { ExchangeTypes } from './types/exchanges';

@Injectable()
export class MessagesProducerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  private sendMessage<K extends keyof MessageTypes>(
    exchange: ExchangeTypes,
    routingKey: K,
    message: MessageTypes[K],
  ) {
    this.amqpConnection.publish(ExchangeTypes[exchange], routingKey, message, {
      timestamp: new Date().getTime(),
    });
  }

  sendFileDownloadScheduledMessage(
    message: MessageTypes['File.DownloadScheduled'],
  ) {
    this.sendMessage(ExchangeTypes.FILE, 'File.DownloadScheduled', message);
  }

  sendTaskScheduledMessage(message: MessageTypes['task.scheduled']) {
    this.sendMessage(ExchangeTypes.GENERAL, 'task.scheduled', message);
  }
}

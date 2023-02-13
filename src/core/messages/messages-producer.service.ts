import { Injectable } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { BaseMessage, MessageTypes } from './types/messageTypes';
import { ExchangeTypes } from './types/exchanges';

@Injectable()
export class MessagesProducerService {
  constructor(private readonly amqpConnection: AmqpConnection) {}

  private sendMessage<
    K extends keyof MessageTypes,
    V extends BaseMessage<MessageTypes[K]>,
  >(exchange: ExchangeTypes, routingKey: K, message: V) {
    this.amqpConnection.publish(ExchangeTypes[exchange], routingKey, message);
  }

  sendFileDownloadScheduledMessage(
    message: MessageTypes['File.DownloadScheduled'],
  ) {
    this.sendMessage(
      ExchangeTypes.FILE,
      'File.DownloadScheduled',
      this.getBaseMessage(message),
    );
  }

  private getBaseMessage<T extends MessageTypes[keyof MessageTypes]>(
    data: T,
    scheduledAt?: string,
  ): BaseMessage<T> {
    return {
      scheduledAt: scheduledAt ?? new Date().toISOString(),
      content: data,
    };
  }
}

import { Controller, Logger } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { ExchangeTypes } from './types/exchanges';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { FileDownloadStatusMessage } from './types/messageTypes';
import { ConsumeMessage } from 'amqplib';
import { MessagesHandlerService } from './messages-handler.service';

@Controller()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesProducerService,
    private readonly messageHandlerService: MessagesHandlerService,
  ) {}

  @RabbitSubscribe({
    exchange: ExchangeTypes.FILE,
    queue: 'File.DownloadComplete',
    createQueueIfNotExists: true,
    errorHandler: (channel, msg, error) => {
      console.error(error);
      console.log('---------');
      console.error(msg);
      console.log('----------');
      console.error(channel);
    },
  })
  async handleFileDownloadStatusMessage(
    payload: FileDownloadStatusMessage,
    amqpMsg: ConsumeMessage,
  ) {
    await this.messageHandlerService.handleFileDownloadStatusMessage(payload);
    Logger.log(payload.taskId, MessagesController.name);
    console.log(amqpMsg.fields.routingKey);
    console.log(Buffer.from(amqpMsg.content).toString('utf-8'));
  }
}

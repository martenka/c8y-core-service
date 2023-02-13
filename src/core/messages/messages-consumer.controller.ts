import { Controller } from '@nestjs/common';
import { MessagesProducerService } from './messages-producer.service';
import { ExchangeTypes } from './types/exchanges';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { BaseMessage, MessageTypes } from './types/messageTypes';
import { MessagesHandlerService } from './messages-handler.service';

@Controller()
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesProducerService,
    private readonly messageHandlerService: MessagesHandlerService,
  ) {}

  @RabbitSubscribe({
    exchange: ExchangeTypes.FILE,
    queue: 'File.DownloadStatus',
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
    payload: BaseMessage<MessageTypes['File.DownloadStatus']>,
  ) {
    await this.messageHandlerService.handleFileDownloadStatusMessage(payload);
  }
}

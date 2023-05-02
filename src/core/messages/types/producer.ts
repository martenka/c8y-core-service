import { MessagesProducerService } from '../messages-producer.service';

export type SendMessageParams = Parameters<
  MessagesProducerService['sendMessage']
>;

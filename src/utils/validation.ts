import { isNil } from '@nestjs/common/utils/shared.utils';
import { Runtype, Static } from 'runtypes';
import { ConsumeMessage } from 'amqplib';
import { Logger } from '@nestjs/common';

export function isPresent<T>(value: T): value is NonNullable<T> {
  return !isNil(value);
}

export function notPresent<T>(
  value: T | undefined | null,
): value is undefined | null {
  return isNil(value);
}

export function isArray(data: unknown): data is Array<unknown> {
  return isPresent(data) && Array.isArray(data);
}

export function ensureArray<T>(value: T | T[]): Array<T> {
  if (notPresent(value)) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  return [value];
}

export function hasNoOwnKeys<T extends object>(value: T): boolean {
  return Object.keys(value).length === 0;
}

type ValidatedMessages<T extends Record<string, { message: Runtype }>> = {
  [K in keyof T]?: (message: Static<T[K]['message']>) => Promise<void>;
};

export async function messageValidator<
  T extends Record<string, { message: Runtype }>,
>(
  message: unknown,
  amqpMessage: ConsumeMessage,
  validationMap: T,
  validatedMessages: ValidatedMessages<T>,
  logger?: Logger,
) {
  const routingKey = amqpMessage.fields.routingKey;
  const messageFn = validatedMessages[routingKey];

  if (notPresent(messageFn)) {
    logger?.log(`Skipping message with unknown routing key ${routingKey}`);
    return Promise.resolve();
  }

  return await messageFn(validationMap[routingKey].message.check(message));
}

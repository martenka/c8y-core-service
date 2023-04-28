import { IsString, MinLength } from 'class-validator';
import { Properties } from '../types/types';

export class KeyValue {
  @IsString()
  @MinLength(1)
  key: string;

  @IsString()
  @MinLength(1)
  value: string;
}

export type KeyValueProperties = Properties<KeyValue>;

export enum SearchType {
  TOKEN = 'token',
  PREFIX = 'prefix',
}

import { IsMongoId } from 'class-validator';
import { IDeleteUsers } from './types';

export class DeleteUserInputDto implements IDeleteUsers {
  @IsMongoId({ each: true })
  items: string[];
}

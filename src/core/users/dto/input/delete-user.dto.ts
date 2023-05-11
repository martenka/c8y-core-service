import { IsMongoId } from 'class-validator';
import { IDeleteUsers } from '../types';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserInputDto implements IDeleteUsers {
  @ApiProperty({
    type: 'string',
    isArray: true,
    description: 'Array of sensor ids to remove',
  })
  @IsMongoId({ each: true })
  items: string[];
}

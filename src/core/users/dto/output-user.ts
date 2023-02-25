import { Exclude, Expose } from 'class-transformer';
import { BaseDeleteResponse } from '../../../global/dto/BaseDeleteResponse';
import { IC8yCredentials } from '../../../models/User';

@Exclude()
export class UserOutputDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  username?: string;

  @Expose()
  roles: string[];

  @Expose()
  c8yCredentials: IC8yCredentials;
}
@Exclude()
export class DeleteUserOutputDto extends BaseDeleteResponse {}

import { Exclude, Expose, Type } from 'class-transformer';
import { BaseDeleteResponse } from '../../../../global/dto/BaseDeleteResponse';

@Exclude()
export class C8yCredentialsOutputDto {
  @Expose()
  username: string;

  @Expose()
  password: string;

  @Expose()
  tenantID: string;

  @Expose()
  baseAddress: string;
}

@Exclude()
export class UserOutputDto {
  @Expose({ name: '_id' })
  id: string;

  @Expose()
  username?: string;

  @Expose()
  roles: string[];

  @Expose()
  @Type(() => C8yCredentialsOutputDto)
  c8yCredentials: C8yCredentialsOutputDto;
}
@Exclude()
export class DeleteUserOutputDto extends BaseDeleteResponse {}

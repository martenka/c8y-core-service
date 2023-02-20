import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserOutputDTO {
  @Expose()
  username?: string;
}

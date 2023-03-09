import { UserType } from '../../../../../models/User';

export interface UserMessage
  extends Partial<Pick<UserType, 'c8yCredentials'> & { deletedAt: string }> {
  id: string;
}

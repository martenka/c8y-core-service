import { UserType } from '../../../models/User';

export type DefaultUserType = Pick<
  UserType,
  'roles' | 'username' | 'password' | 'c8yCredentials'
>;

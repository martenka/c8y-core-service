import { UserType } from '../../../models/User';
import { Role } from '../../../global/types/roles.';
import { TaskType } from '../../../models';

export interface IAccessTokenPayload {
  sub: string;
  usr: string;
  roles: Role[];
}

export interface AccessResponse {
  access_token: string;
}

export type LoggedInUserType = {
  [P in keyof Pick<UserType, 'username' | '_id'>]: string;
} & Pick<UserType, 'roles'>;

export type WithInitiatedByUser<T> = T & Pick<TaskType, 'initiatedByUser'>;

import { UserType } from '../../../models/User';
import { Role } from '../../../global/types/roles';
import { TaskType } from '../../../models';
import { Properties } from '../../../global/types/types';
import { LoginResponseDto } from '../dto/output/login-response.dto';

export interface IAccessTokenPayload {
  sub: string;
  usr: string;
  roles: Role[];
}

export type AccessResponse = Properties<LoginResponseDto>;

export type LoggedInUserType = {
  [P in keyof Pick<UserType, 'username' | '_id'>]: string;
} & Pick<UserType, 'roles'>;

export type WithInitiatedByUser<T> = T & Pick<TaskType, 'initiatedByUser'>;

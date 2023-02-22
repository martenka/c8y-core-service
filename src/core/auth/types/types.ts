import { LeanDocument } from 'mongoose';
import { UserDocument } from '../../../models/User';
import { Role } from '../../../global/types/roles.';

export interface IAccessTokenPayload {
  sub: string;
  usr: string;
  roles: Role[];
}

export interface AccessResponse {
  access_token: string;
}

export type LeanUser = {
  [P in keyof Pick<LeanDocument<UserDocument>, 'username' | '_id'>]: string;
} & Pick<LeanDocument<UserDocument>, 'roles'>;

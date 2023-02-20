import { LeanDocument } from 'mongoose';
import { UserDocument } from '../../../models/User';

export interface IAccessTokenPayload {
  sub: string;
  usr: string;
}

export interface AccessResponse {
  access_token: string;
}

export type LeanUser = {
  [P in keyof Pick<LeanDocument<UserDocument>, 'username' | '_id'>]: string;
};

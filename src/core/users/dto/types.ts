import { IDeleteResponse } from '../../../global/dto/types';
import { Role } from '../../../global/types/roles.';
import { C8yCredentialsType } from '../../../models/User';

export interface IDeleteUsers {
  items: string[];
}

export type IDeleteUsersResponse = IDeleteResponse;

export interface IUpdateUser {
  role?: Role[];
  c8yCredentials?: Partial<C8yCredentialsType>;
}

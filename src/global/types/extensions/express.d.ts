import { LeanUser } from '../../../core/auth/types/types';

export {};
declare global {
  namespace Express {
    //Letting eslint fix next line loses custom properties on the "user" object
    //eslint-disable-next-line @typescript-eslint/no-empty-interface
    export interface User extends LeanUser {}
  }
}

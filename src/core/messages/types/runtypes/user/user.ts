import { Partial, Record, Static, String } from 'runtypes';
import { ISOString, StrictString } from '../common';

export const C8yCredentials = Partial({
  username: String,
  password: String,
  tenantID: String,
  baseAddress: String,
});

export const UserMessageRuntype = Record({
  id: StrictString,
}).And(
  Partial({
    deletedAt: ISOString,
    c8yCredentials: C8yCredentials,
  }),
);

export type C8yCredentials = Static<typeof C8yCredentials>;
export type UserMessage = Static<typeof UserMessageRuntype>;

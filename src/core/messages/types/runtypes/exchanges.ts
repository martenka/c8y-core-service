import { Literal, Static, Union } from 'runtypes';

export const ExchangeTypesRuntype = Union(Literal('General'));

export type Exchanges = Static<typeof ExchangeTypesRuntype>;

import { Type } from '@nestjs/common';

export type Properties<T> = {
  [Key in keyof T]: T extends Type ? Properties<T[Key]> : T[Key];
};

export type HandlersType<
  KeyType extends object,
  ValueType extends object,
  ReturnType,
> = {
  [K in keyof KeyType]: (value: ValueType) => ReturnType;
};

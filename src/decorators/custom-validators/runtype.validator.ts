import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { Runtype } from 'runtypes';

export function IsRuntype(
  runtype: Runtype,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsRuntype',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: `Invalid ${propertyName} value(s) provided!`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          return runtype.guard(value);
        },
      },
    });
  };
}

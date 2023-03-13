import {
  isNumberString,
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

import humanInterval from 'human-interval';
import cronParser from 'cron-parser';

export function IsValidTaskPeriodicPattern(
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsValidTaskPeriodicPattern',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value === 'string') {
            try {
              if (isNumberString(value)) {
                return true;
              }

              const interval = humanInterval(value);

              if (!isNaN(interval) && interval > 0) {
                return true;
              }

              cronParser.parseExpression(value);
              return true;
            } catch (e) {
              return false;
            }
          }

          return false;
        },
      },
    });
  };
}

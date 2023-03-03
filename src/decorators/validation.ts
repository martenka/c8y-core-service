import { ValidatorOptions } from 'class-validator';
import { SetMetadata } from '@nestjs/common';

export const OVERRIDE_VALIDATION_OPTIONS = 'OVERRIDE_VALIDATION_OPTIONS';

export function OverrideValidationOptions(options: ValidatorOptions) {
  return SetMetadata(OVERRIDE_VALIDATION_OPTIONS, options);
}

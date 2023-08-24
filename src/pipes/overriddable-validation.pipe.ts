import { ArgumentMetadata, Injectable, ValidationPipe } from '@nestjs/common';
import { OVERRIDE_VALIDATION_OPTIONS } from '../decorators/validation';
import { notPresent } from '../utils/validation';

@Injectable()
export class OverridableValidationPipe extends ValidationPipe {
  // https://github.com/nestjs/nest/issues/2390#issuecomment-502042256
  async transform(value: unknown, metadata: ArgumentMetadata) {
    if (notPresent(metadata.metatype)) {
      throw new Error(
        'metatype ArgumentMetadata is missing for OverridableValidationPipe',
      );
    }
    const options = Reflect.getMetadata(
      OVERRIDE_VALIDATION_OPTIONS,
      metadata.metatype,
    );
    let originOptions;
    if (options) {
      originOptions = Object.assign({}, this.validatorOptions);
      this.validatorOptions = Object.assign(this.validatorOptions, options);
    }
    const result = super.transform(value, metadata);
    if (originOptions) {
      this.validatorOptions = originOptions;
    }
    return result;
  }
}

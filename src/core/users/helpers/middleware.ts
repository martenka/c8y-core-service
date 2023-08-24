import { ApplicationConfigService } from '../../application-config/application-config.service';
import { UserSchema } from '../../../models/User';
import * as bcrypt from 'bcrypt';
import { notPresent } from '../../../utils/validation';
import { InternalServerErrorException, Logger } from '@nestjs/common';

export const usersMongoosePasswordHashMiddleware = async (
  config: ApplicationConfigService,
  shouldSkipMiddlewareAddition?: boolean,
) => {
  const schema = UserSchema;

  if (!shouldSkipMiddlewareAddition) {
    schema.pre('save', async function (next) {
      if (!this.isModified('password')) {
        return next();
      }

      const salt = await bcrypt.genSalt(config.secretConfig.SALT_WORK_FACTOR);

      if (notPresent(this.password)) {
        new Logger('UsersMongoosePasswordHashMiddleware').error(
          `Unable to hash user ${this?._id?.toString()} password - password missing`,
        );
        throw new InternalServerErrorException();
      }

      this.password = await bcrypt.hash(this.password, salt);

      next();
    });
  }

  return schema;
};

import { ApplicationConfigService } from '../../application-config/application-config.service';
import { UserSchema } from '../../../models/User';
import * as bcrypt from 'bcrypt';

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

      this.password = await bcrypt.hash(this.password, salt);

      next();
    });
  }

  return schema;
};

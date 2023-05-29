import { ApplicationConfigService } from '../../application-config/application-config.service';
import { UserSchema } from '../../../models/User';
import * as bcrypt from 'bcrypt';

export const usersMongooseFactory = async (
  config: ApplicationConfigService,
) => {
  const schema = UserSchema;

  schema.pre('save', async function (next) {
    if (!this.isModified('password')) {
      return next();
    }

    const salt = await bcrypt.genSalt(config.secretConfig.SALT_WORK_FACTOR);

    this.password = await bcrypt.hash(this.password, salt);

    next();
  });

  return schema;
};

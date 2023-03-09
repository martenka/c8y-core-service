import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserDocument, UserSchema } from '../../models/User';
import * as bcrypt from 'bcrypt';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { MessagesModule } from '../messages/messages.module';

@Module({
  imports: [
    MessagesModule,
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: async (config: ApplicationConfigService) => {
          const schema = UserSchema;

          schema.pre('save', async function (next) {
            if (!this.isModified('password')) {
              return next();
            }

            const salt = await bcrypt.genSalt(
              config.secretConfig.SALT_WORK_FACTOR,
            );

            this.password = await bcrypt.hash(this.password, salt);

            next();
          });

          schema.methods.isPasswordMatch = async function (
            passwordToCompare,
          ): Promise<boolean> {
            // eslint-disable-next-line @typescript-eslint/no-this-alias
            const user: UserDocument = this;
            return await bcrypt.compare(passwordToCompare, user.password);
          };

          return schema;
        },
        inject: [ApplicationConfigService],
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

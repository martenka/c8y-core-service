import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User } from '../../models';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { MessagesModule } from '../messages/messages.module';
import { usersMongoosePasswordHashMiddleware } from './helpers/middleware';

@Module({
  imports: [
    MessagesModule,
    MongooseModule.forFeatureAsync([
      {
        name: User.name,
        useFactory: usersMongoosePasswordHashMiddleware,
        inject: [ApplicationConfigService],
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

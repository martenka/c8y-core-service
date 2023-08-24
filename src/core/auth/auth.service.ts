import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/input/create-user.dto';
import { PasswordCheck, UserDocument, UserType } from '../../models/User';
import {
  AccessResponse,
  IAccessTokenPayload,
  LoggedInUserType,
} from './types/types';
import { MongoServerError } from 'mongodb';
import { MessagesProducerService } from '../messages/messages-producer.service';
import { ApplicationConfigService } from '../application-config/application-config.service';
import { isPresent, notPresent } from '../../utils/validation';

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private userService: UsersService,
    private messagesProducerService: MessagesProducerService,
    private configService: ApplicationConfigService,
  ) {}

  async validateUser(
    username: string,
    password: string,
  ): Promise<LoggedInUserType | undefined> {
    const user = (await this.userService.findOne(
      {
        username,
      },
      true,
    )) as UserDocument & PasswordCheck;

    if (notPresent(user) || !(await user.isPasswordMatch(password))) {
      throw new UnauthorizedException();
    }

    return user.toObject();
  }

  login(user: LoggedInUserType): AccessResponse {
    const payload: IAccessTokenPayload = {
      usr: user.username,
      sub: user._id,
      roles: user.roles,
    };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  /**
   *
   * Throws **BadRequestException** if username already exists, user cannot be created or user id is missing
   */
  async register(user: CreateUserDto): Promise<UserDocument> {
    try {
      const createdUser = await this.userService.create(user);
      if (notPresent(createdUser)) {
        throw new BadRequestException(
          'Check your request - unable to register a new user',
        );
      }
      const leanUser: UserType = createdUser.toObject();
      if (notPresent(leanUser._id)) {
        this.logger.error(
          'Unable to register new user - user id is missing',
          user,
        );
        throw new InternalServerErrorException();
      }
      this.messagesProducerService.sendUserMessage({
        id: leanUser._id.toString(),
        c8yCredentials: leanUser.c8yCredentials,
      });
      return createdUser;
    } catch (e) {
      // https://docs.rs/mongodb/0.1.6/src/mongodb/.cargo/registry/src/github.com-1ecc6299db9ec823/mongodb-0.1.6/src/error.rs.html
      if (e instanceof MongoServerError && e.code == 11000) {
        throw new BadRequestException('Username already exists!');
      }

      throw e;
    }
  }

  async handleDefaultUser() {
    const user = this.configService.defaultUser;
    if (isPresent(user) && isPresent(user.username)) {
      const existingUser = await this.userService.findOne({
        username: user.username,
      });
      if (notPresent(existingUser)) {
        if (notPresent(user.password)) {
          this.logger.log(
            'Skipping creation of default user as user password is missing',
          );
          return;
        }
        await this.register({
          username: user.username,
          password: user.password,
          role: user.roles,
          c8yCredentials: user.c8yCredentials,
        });
        this.logger.log(`Created default user with username: ${user.username}`);
      } else {
        this.logger.log(
          `Skipping creating default user as user ${user.username} already exists!`,
        );
      }
    } else {
      this.logger.log(
        'Skipping creating default user as username is not specified',
      );
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.handleDefaultUser();
  }
}

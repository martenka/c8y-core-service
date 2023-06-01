import { JwtModuleOptions } from '@nestjs/jwt/dist/interfaces/jwt-module-options.interface';
import { IAccessTokenPayload } from '../../core/auth/types/types';
import { JwtService } from '@nestjs/jwt';
import { getCreateUserDtoStub } from '../stubs/user';
import { Types } from 'mongoose';

import { Role } from '../../global/types/roles';
import { CreateUserDto } from '../../core/users/dto/input/create-user.dto';

interface GetTestUserOptions {
  jwtService: JwtService;
  roles?: Role[];
}

interface GetTestUserResponse {
  userToken: string;
  createUserStub: CreateUserDto;
}

export const getTestJwtConfig = (
  override?: Partial<JwtModuleOptions>,
): JwtModuleOptions => {
  return {
    signOptions: {
      algorithm: 'HS256',
      expiresIn: '1h',
    },
    secret: '123',
    verifyOptions: {
      algorithms: ['HS256'],
    },
    ...override,
  };
};

export function getTestJwtToken(
  payload: IAccessTokenPayload,
  jwtService: JwtService,
) {
  return jwtService.sign(payload);
}

export function getTestUser(
  username: string,
  userId: string,
  input: GetTestUserOptions,
): GetTestUserResponse {
  const userDtoStub = getCreateUserDtoStub({
    username: 'searches_sensors_user',
  });
  const userObjectId = new Types.ObjectId(userId);

  const userToken = getTestJwtToken(
    {
      roles: input.roles ?? [Role.User, Role.Admin],
      usr: userDtoStub.username,
      sub: userObjectId.toString(),
    },
    input.jwtService,
  );

  return {
    createUserStub: userDtoStub,
    userToken,
  };
}

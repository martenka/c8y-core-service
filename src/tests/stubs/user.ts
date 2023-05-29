import { Role } from '../../global/types/roles';
import { CreateUserDto } from '../../core/users/dto/input/create-user.dto';

export function getCreateUserDtoStub(
  override?: Partial<CreateUserDto>,
): CreateUserDto {
  return {
    username: 'testUser',
    password: 'testPassword',
    c8yCredentials: {
      password: 'c8y-user',
      username: 'c8y-pass',
      baseAddress: 'https://localhost/',
      tenantID: 'c8y-tenat',
    },
    role: [Role.Admin],
    ...override,
  };
}

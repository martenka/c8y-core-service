import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ensureArray } from '../../../utils/validation';
import { Role } from '../../../global/types/roles';

class PartialC8yCredentialsInputDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  tenantID?: string;

  @IsOptional()
  @IsUrl()
  baseAddress?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @Transform(({ value }) => ensureArray(value))
  @IsEnum(Role, { each: true, message: 'Invalid Role value provided!' })
  role?: Role[];

  @IsOptional()
  @Type(() => PartialC8yCredentialsInputDto)
  @ValidateNested()
  c8yCredentials?: PartialC8yCredentialsInputDto;
}

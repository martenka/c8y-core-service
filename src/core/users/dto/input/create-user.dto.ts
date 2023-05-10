import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { Role } from '../../../../global/types/roles';
import { ensureArray } from '../../../../utils/validation';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class C8yCredentialsInputDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsString()
  tenantID: string;

  @IsUrl()
  baseAddress: string;
}

export class CreateUserDto {
  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsOptional()
  @Transform(({ value }) => ensureArray(value))
  @IsEnum(Role, { each: true, message: 'Invalid Role value provided!' })
  role?: Role[];

  @IsOptional()
  @ApiPropertyOptional()
  @Type(() => C8yCredentialsInputDto)
  @ValidateNested()
  c8yCredentials?: C8yCredentialsInputDto;
}

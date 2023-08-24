import {
  Body,
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/input/create-user.dto';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { NoDTOValidation, SetControllerDTO } from '../../decorators/dto';
import { UserOutputDto } from '../users/dto/output/output-user.dto';
import { LocalAuthGuard } from './local/local-auth.guard';
import { UserDocument } from '../../models/User';
import { NoAuthRoute } from '../../decorators/authentication';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/input/login.dto';
import { AccessResponse, LoggedInUserType } from './types/types';
import { LoginResponseDto } from './dto/output/login-response.dto';
import { AdminRoute } from '../../decorators/authorization';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { LoggedInUser } from '../../decorators/user';

@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @NoDTOValidation()
  @NoAuthRoute()
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ operationId: 'Login' })
  @ApiTags('auth')
  @ApiBody({
    required: true,
    type: LoginDto,
  })
  @ApiResponse({
    status: 201,
    type: LoginResponseDto,
    description: 'Access token was created',
  })
  async login(@LoggedInUser() user: LoggedInUserType): Promise<AccessResponse> {
    return this.authService.login(user);
  }

  @Post('/register')
  @AdminRoute()
  @SetControllerDTO(UserOutputDto, {
    apiResponseOptions: { description: 'User registered', status: 201 },
  })
  @ApiOperation({ operationId: 'Register a new user' })
  @ApiTags('auth')
  async register(@Body() userCreateDto: CreateUserDto): Promise<UserDocument> {
    return await this.authService.register(userCreateDto);
  }
}

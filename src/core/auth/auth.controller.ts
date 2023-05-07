import {
  Body,
  Controller,
  Post,
  Request,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Request as ExpressRequest } from 'express';
import { CreateUserDto } from '../users/dto/input/create-user.dto';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { NoDTOValidation, SetControllerDTO } from '../../decorators/dto';
import { UserOutputDto } from '../users/dto/output/output-user.dto';
import { LocalAuthGuard } from './local/local-auth.guard';
import { UserDocument } from '../../models/User';
import { NoAuthRoute } from '../../decorators/authentication';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/input/login.dto';
import { AccessResponse } from './types/types';
import { LoginResponseDto } from './dto/output/login-response.dto';

@UseInterceptors(DtoTransformInterceptor)
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
  async login(@Request() req: ExpressRequest): Promise<AccessResponse> {
    return this.authService.login(req.user);
  }

  @Post('/register')
  @SetControllerDTO(UserOutputDto, {
    apiResponseOptions: { description: 'User registered' },
  })
  @ApiOperation({ operationId: 'Register a new user' })
  @ApiTags('auth')
  async register(@Body() userCreateDto: CreateUserDto): Promise<UserDocument> {
    return await this.authService.register(userCreateDto);
  }
}

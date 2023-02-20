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
import { CreateUserDto } from '../users/dto/create-user.dto';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { NoDTOValidation, SetControllerDTO } from '../../decorators/dto';
import { UserOutputDTO } from '../users/dto/output-user';
import { LocalAuthGuard } from './local/local-auth.guard';
import { UserDocument } from '../../models/User';
import { IsPublicRoute } from '../../decorators/auth';

@UseInterceptors(DtoTransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @NoDTOValidation()
  @IsPublicRoute()
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req: ExpressRequest): Promise<unknown> {
    return this.authService.login(req.user);
  }

  @SetControllerDTO(UserOutputDTO)
  @Post('/register')
  async register(@Body() userCreateDto: CreateUserDto): Promise<UserDocument> {
    return await this.authService.register(userCreateDto);
  }
}

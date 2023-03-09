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
import { UserOutputDto } from '../users/dto/output-user';
import { LocalAuthGuard } from './local/local-auth.guard';
import { UserDocument, UserType } from '../../models/User';
import { NoAuthRoute } from '../../decorators/authentication';
import { MessagesProducerService } from '../messages/messages-producer.service';

@UseInterceptors(DtoTransformInterceptor)
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly messagesProducerService: MessagesProducerService,
  ) {}

  @NoDTOValidation()
  @NoAuthRoute()
  @UseGuards(LocalAuthGuard)
  @Post('/login')
  async login(@Request() req: ExpressRequest): Promise<unknown> {
    return this.authService.login(req.user);
  }

  @SetControllerDTO(UserOutputDto)
  @Post('/register')
  async register(@Body() userCreateDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = await this.authService.register(userCreateDto);
    const leanUser: UserType = createdUser.toObject();
    this.messagesProducerService.sendUserMessage({
      id: leanUser._id.toString(),
      c8yCredentials: leanUser.c8yCredentials,
    });

    return createdUser;
  }
}

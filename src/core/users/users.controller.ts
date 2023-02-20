import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserDocument } from '../../models/User';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { SetControllerDTO } from '../../decorators/dto';
import { UserOutputDTO } from './dto/output-user';

@Controller('users')
@UseInterceptors(DtoTransformInterceptor)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @SetControllerDTO(UserOutputDTO)
  async findOne(@Param('id') id: string): Promise<UserDocument | undefined> {
    return await this.usersService.findOne({ id });
  }
}

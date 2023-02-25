import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserDocument } from '../../models/User';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { NoDTOValidation, SetControllerDTO } from '../../decorators/dto';
import { UserOutputDto } from './dto/output-user';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { DeleteUserInputDto } from './dto/delete-user.dto';
import { IDeleteUsersResponse } from './dto/types';
import { AdminRoute } from '../../decorators/authorization';
import { UpdateUserDto } from './dto/update-user.dto';
import { isNil } from '@nestjs/common/utils/shared.utils';

@Controller('users')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @SetControllerDTO(UserOutputDto)
  async findOne(@Param('id') id: string): Promise<UserDocument | undefined> {
    return await this.usersService.findOne({ id });
  }

  @Post('/delete')
  @AdminRoute()
  @HttpCode(HttpStatus.OK)
  @NoDTOValidation()
  async deleteUsers(
    @Body() deleteEntityDto: DeleteUserInputDto,
  ): Promise<IDeleteUsersResponse> {
    return await this.usersService.delete(deleteEntityDto);
  }

  @Patch(':id')
  @AdminRoute()
  @SetControllerDTO(UserOutputDto)
  async updateUser(
    @Param() id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const result = await this.usersService.updateOne(id, updateUserDto);
    if (isNil(result)) {
      throw new NotFoundException();
    }
    return result;
  }
}

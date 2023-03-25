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
import { UserOutputDto } from './dto/output/output-user.dto';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { DeleteUserInputDto } from './dto/input/delete-user.dto';
import { IDeleteUsersResponse } from './dto/types';
import { AdminRoute } from '../../decorators/authorization';
import { UpdateUserDto } from './dto/input/update-user.dto';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('users')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @SetControllerDTO(UserOutputDto)
  @ApiTags('users')
  @ApiOperation({ operationId: 'Get one user' })
  async findOne(@Param('id') id: string): Promise<UserDocument | undefined> {
    return await this.usersService.findOne({ id });
  }

  @Post('/delete')
  @AdminRoute()
  @HttpCode(HttpStatus.OK)
  @NoDTOValidation()
  @ApiTags('users')
  @ApiOperation({ operationId: 'Remove users' })
  async deleteUsers(
    @Body() deleteEntityDto: DeleteUserInputDto,
  ): Promise<IDeleteUsersResponse> {
    return await this.usersService.deleteAndSendMessages(deleteEntityDto);
  }

  @Patch(':id')
  @AdminRoute()
  @SetControllerDTO(UserOutputDto)
  @ApiTags('users')
  @ApiOperation({ operationId: 'Update user' })
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

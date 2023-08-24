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

import { AdminRoute } from '../../decorators/authorization';
import { UpdateUserDto } from './dto/input/update-user.dto';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { MongoIdTransformPipe } from '../../pipes/mongo-id.pipe';
import { Types } from 'mongoose';
import { notPresent } from '../../utils/validation';

@Controller('users')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':id')
  @SetControllerDTO(UserOutputDto)
  @ApiTags('users')
  @ApiOperation({ operationId: 'Get one user' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @Param('id', MongoIdTransformPipe) id: Types.ObjectId,
  ): Promise<UserDocument | undefined> {
    return await this.usersService.findOne({ id });
  }

  @Post('/delete')
  @AdminRoute()
  @HttpCode(HttpStatus.OK)
  @NoDTOValidation()
  @ApiTags('users')
  @ApiOperation({ operationId: 'Remove users' })
  async deleteUsers(@Body() deleteEntityDto: DeleteUserInputDto) {
    try {
      await this.usersService.delete(deleteEntityDto);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  @Patch(':id')
  @AdminRoute()
  @SetControllerDTO(UserOutputDto)
  @ApiTags('users')
  @ApiOperation({ operationId: 'Update user' })
  async updateUser(
    @Param('id', MongoIdTransformPipe) id: Types.ObjectId,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const result = await this.usersService.updateOne(id, updateUserDto);
    if (notPresent(result)) {
      throw new NotFoundException();
    }
    return result;
  }
}

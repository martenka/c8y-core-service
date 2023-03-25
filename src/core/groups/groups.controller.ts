import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  ParseArrayPipe,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupDocument } from '../../models/Group';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { SetControllerDTO } from '../../decorators/dto';
import { OutputGroupDto } from './dto/output-group.dto';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { AdminRoute } from '../../decorators/authorization';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@Controller('groups')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @AdminRoute()
  @SetControllerDTO(OutputGroupDto)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Create a new group' })
  @ApiBody({ type: [CreateGroupDto] })
  @ApiResponse({
    type: [OutputGroupDto],
  })
  async create(
    @Body(new ParseArrayPipe({ items: CreateGroupDto }))
    createGroupDto: CreateGroupDto[],
  ): Promise<GroupDocument[] | undefined> {
    const newGroups = await this.groupsService.createGroups(createGroupDto);
    for (const group of newGroups) {
      await group.populate('sensors');
    }

    return newGroups;
  }

  @Get(':id')
  @SetControllerDTO(OutputGroupDto)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Get one group' })
  @ApiResponse({
    type: OutputGroupDto,
  })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne({ id });
  }

  @Get()
  @SetControllerDTO(OutputGroupDto)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Get all groups' })
  @ApiResponse({
    type: [OutputGroupDto],
  })
  findAll() {
    return this.groupsService.findAllGroups();
  }

  @Patch()
  @AdminRoute()
  @SetControllerDTO(OutputGroupDto)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Update groups' })
  @ApiResponse({
    type: [OutputGroupDto],
  })
  /**
   * Updates the underlying group by merging the sensors
   */
  update(
    @Body(new ParseArrayPipe({ items: UpdateGroupDto }))
    updateGroupDto: UpdateGroupDto[],
  ) {
    return this.groupsService.updateGroups(updateGroupDto);
  }

  @Delete(':id')
  @AdminRoute()
  @SetControllerDTO(OutputGroupDto)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Delete group' })
  remove(@Param('id') id: string) {
    return this.groupsService.removeGroup(id);
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group, GroupDocument } from '../../models/Group';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { SetControllerDTO, SetExposeGroups } from '../../decorators/dto';
import {
  OutputGroupDto,
  PaginatedOutputGroupDto,
} from './dto/output-group.dto';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { AdminRoute } from '../../decorators/authorization';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GroupQuery } from './query/group-query.dto';
import { PagingQuery } from '../../global/pagination/pagination.dto';
import { DBPagingResult } from '../../global/pagination/types';
import { Groups } from '../../global/tokens';

@Controller('groups')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @AdminRoute()
  @SetControllerDTO(OutputGroupDto, {
    isArray: true,
    apiResponseOptions: { status: 201 },
  })
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Create a new group' })
  @ApiBody({ type: [CreateGroupDto] })
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

  @Get('/search')
  @SetControllerDTO(PaginatedOutputGroupDto)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Search groups' })
  async findGroups(
    @Query() groupsQuery: GroupQuery,
    @Query() pagingQuery: PagingQuery,
  ): Promise<DBPagingResult<Group>> {
    return await this.groupsService.findMany(groupsQuery, pagingQuery);
  }

  @Get(':id')
  @SetControllerDTO(OutputGroupDto)
  @SetExposeGroups(Groups.ALL)
  @ApiTags('groups')
  @ApiOperation({ operationId: 'Get one group' })
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne({ id });
  }

  @Patch()
  @AdminRoute()
  @SetControllerDTO(OutputGroupDto, { isArray: true })
  @ApiTags('groups')
  @ApiOperation({
    operationId: 'Update groups',
    description: 'Merges new sensors with existing ones',
  })
  @ApiBody({ type: [UpdateGroupDto] })
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

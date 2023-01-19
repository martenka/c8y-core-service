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

@Controller('groups')
@UseInterceptors(DtoTransformInterceptor)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @SetControllerDTO(OutputGroupDto)
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

  @Get()
  @SetControllerDTO(OutputGroupDto)
  findAll() {
    return this.groupsService.findAllGroups();
  }

  @Get(':id')
  @SetControllerDTO(OutputGroupDto)
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne({ id });
  }

  @Patch()
  @SetControllerDTO(OutputGroupDto)
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
  @SetControllerDTO(OutputGroupDto)
  remove(@Param('id') id: string) {
    return this.groupsService.removeGroup(id);
  }
}

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';

import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { UseRolesGuard } from '../../guards/RoleGuard';

import { TaskTransformPipe } from '../../pipes/task-transform.pipe';
import { CreateTaskDto } from './dto/input/create-task';

import { TaskCreationDtos } from './dto/dto-map';
import { TasksService } from './tasks.service';
import { AdminRoute } from '../../decorators/authorization';
import { SetControllerDTO, SetExposeGroups } from '../../decorators/dto';
import {
  OutputTaskDto,
  PaginatedOutputTaskDto,
} from './dto/output/output-task.dto';
import { Groups } from '../../global/tokens';
import { idToObjectID } from '../../utils/helpers';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Task, TaskDocument } from '../../models';
import { DBPagingResult } from '../../global/pagination/types';
import { PagingQuery } from '../../global/pagination/pagination';

@Controller('tasks')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @AdminRoute()
  @SetControllerDTO(OutputTaskDto)
  @SetExposeGroups(Groups.ALL)
  async createTask<T extends CreateTaskDto>(
    @Body(new TaskTransformPipe(TaskCreationDtos))
    task: T,
  ): Promise<object | undefined> {
    return await this.tasksService.createAndScheduleTask(task);
  }

  @Get('/search')
  @SetControllerDTO(PaginatedOutputTaskDto)
  async searchTasks(
    @Query() pagingQuery: PagingQuery,
  ): Promise<DBPagingResult<Task> | undefined> {
    return await this.tasksService.findMany(pagingQuery);
  }

  @Get(':id')
  @SetControllerDTO(OutputTaskDto)
  @SetExposeGroups(Groups.ALL)
  async getTaskDetails(@Param('id') id: string): Promise<TaskDocument> {
    const objectId = idToObjectID(id);
    const result = await this.tasksService.findById(objectId);
    if (isNil(objectId)) {
      throw new NotFoundException();
    }
    return result;
  }
}

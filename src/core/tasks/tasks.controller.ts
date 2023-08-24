import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseInterceptors,
} from '@nestjs/common';

import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { UseRolesGuard } from '../../guards/RoleGuard';

import { TaskTransformPipe } from '../../pipes/task-transform.pipe';
import { CreateTaskDto } from './dto/input/create-task.dto';

import { TaskCreationDtos } from './dto/dto-map';
import { TasksService } from './tasks.service';
import { AdminRoute } from '../../decorators/authorization';
import { SetControllerDTO, SetExposeGroups } from '../../decorators/dto';
import {
  OutputTaskDto,
  PaginatedOutputTaskDto,
} from './dto/output/output-task.dto';
import { Groups } from '../../global/tokens';
import { idToObjectIDOrUndefined } from '../../utils/helpers';
import { Task, TaskDocument } from '../../models';
import { DBPagingResult } from '../../global/pagination/types';
import { PagingQuery } from '../../global/pagination/pagination.dto';
import { LoggedInUser } from '../../decorators/user';
import { LoggedInUserType } from '../auth/types/types';
import { ApiBody, ApiOperation, ApiTags, getSchemaPath } from '@nestjs/swagger';
import { TaskQuery } from './query/task-query.dto';
import { CreateDataFetchDto } from './dto/input/create-datafetch-task.dto';
import { CreateDataUploadTaskDto } from './dto/input/create-dataupload-task.dto';
import { CreateObjectSyncDto } from './dto/input/create-objectsync-task.dto';
import { TaskModeDto } from './dto/input/task-mode.dto';
import { notPresent } from '../../utils/validation';

@Controller('tasks')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Put('/mode')
  @AdminRoute()
  @ApiTags('tasks')
  @ApiOperation({
    operationId: 'Set mode for tasks',
    description: 'Allows to disable/enable periodic tasks',
  })
  async setTaskMode(@Body() taskModeBody: TaskModeDto): Promise<void> {
    await this.tasksService.sendTaskMode(taskModeBody);
  }

  @Post()
  @AdminRoute()
  @SetControllerDTO(OutputTaskDto)
  @SetExposeGroups(Groups.ALL)
  @ApiTags('tasks')
  @ApiOperation({ operationId: 'Create a new task' })
  @ApiBody({
    schema: {
      anyOf: [
        { $ref: getSchemaPath(CreateDataFetchDto) },
        { $ref: getSchemaPath(CreateDataUploadTaskDto) },
        { $ref: getSchemaPath(CreateObjectSyncDto) },
      ],
    },
  })
  async createTask<T extends CreateTaskDto>(
    @LoggedInUser() user: LoggedInUserType,
    @Body(new TaskTransformPipe(TaskCreationDtos))
    task: T,
  ): Promise<object | undefined> {
    try {
      return await this.tasksService.createAndScheduleTask(user._id, task);
    } catch (e) {
      if (e instanceof Error) {
        throw new BadRequestException(e.message);
      }
    }
  }

  @Get('/search')
  @SetControllerDTO(PaginatedOutputTaskDto)
  @ApiTags('tasks')
  @ApiOperation({ operationId: 'Search tasks' })
  async searchTasks(
    @Query() searchQuery: TaskQuery,
    @Query() pagingQuery: PagingQuery,
  ): Promise<DBPagingResult<Task> | undefined> {
    return await this.tasksService.findMany(searchQuery, pagingQuery);
  }

  @Get(':id')
  @SetControllerDTO(OutputTaskDto)
  @SetExposeGroups(Groups.ALL)
  @ApiTags('tasks')
  @ApiOperation({ operationId: 'Get one task' })
  async getTaskDetails(@Param('id') id: string): Promise<TaskDocument> {
    const objectId = idToObjectIDOrUndefined(id);
    if (notPresent(objectId)) {
      throw new NotFoundException();
    }
    const foundTask = await this.tasksService.findById(objectId);
    if (notPresent(foundTask)) {
      throw new NotFoundException();
    }
    return foundTask;
  }
}

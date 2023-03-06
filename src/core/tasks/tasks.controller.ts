import { Controller, Post, Body, UseInterceptors } from '@nestjs/common';

import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { UseRolesGuard } from '../../guards/RoleGuard';

import { TaskTransformPipe } from '../../pipes/task-transform.pipe';
import { CreateTaskDto } from './dto/input/create-task';

import { TaskCreationDtos } from './dto/dto-map';
import { TasksService } from './tasks.service';
import { AdminRoute } from '../../decorators/authorization';
import { SetControllerDTO, SetExposeGroups } from '../../decorators/dto';
import { OutputTaskDto } from './dto/output/output-task.dto';
import { Groups } from '../../global/tokens';

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
    return await this.tasksService.createTask(task);
  }
}

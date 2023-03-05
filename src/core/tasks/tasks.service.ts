import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task';
import { TaskCreationService } from './task-creation.service';
import { TaskDocument } from '../../models';

@Injectable()
export class TasksService {
  constructor(private readonly taskCreationService: TaskCreationService) {}
  async createTask<T extends CreateTaskDto>(task: T): Promise<TaskDocument> {
    return await this.taskCreationService.createTask(task);
  }
}

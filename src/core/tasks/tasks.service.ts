import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task';

@Injectable()
export class TasksService {
  async createTask<T extends CreateTaskDto>(task: T) {
    return task;
  }
}

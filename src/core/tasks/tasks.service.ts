import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/input/create-task';
import { TaskCreationService } from './task-creation.service';
import { Task, TaskDocument, TaskModel } from '../../models';
import { Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import {
  DBPagingResult,
  PagingOptionsType,
} from '../../global/pagination/types';
import { SkipPagingService } from '../paging/skip-paging.service';

@Injectable()
export class TasksService {
  constructor(
    private readonly taskCreationService: TaskCreationService,
    private skipPagingService: SkipPagingService,
    @InjectModel(Task.name) private readonly taskModel: TaskModel,
  ) {}
  async createTask<T extends CreateTaskDto>(task: T): Promise<TaskDocument> {
    return await this.taskCreationService.createTask(task);
  }

  async findById(id: Types.ObjectId): Promise<TaskDocument | undefined> {
    return this.taskModel.findById(id).exec();
  }

  async findMany(
    pagingOptions: PagingOptionsType,
  ): Promise<DBPagingResult<Task>> {
    return await this.skipPagingService.findWithPagination(
      this.taskModel,
      {},
      { _id: 1 },
      pagingOptions,
    );
  }
}

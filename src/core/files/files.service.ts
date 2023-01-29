import { BadRequestException, Injectable } from '@nestjs/common';
import { UpdateFileDto } from './dto/update-file.dto';
import { MessagesProducerService } from '../messages/messages-producer.service';
import { FileDownloadDto } from './dto/file-download.dto';
import { FileTaskSearchOptions } from '../../models/types/types';
import { InjectModel } from '@nestjs/mongoose';
import {
  FileTask,
  TaskDocument,
  TaskModel,
  TaskSteps,
} from '../../models/FileTask';
import { idToObjectID, remapIDAndRemoveNil } from '../../utils/helpers';
import { hasNoOwnKeys } from '../../utils/validation';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { Types } from 'mongoose';
import { Group } from '../../models';
import { GroupModel } from '../../models/Group';
import { randomUUID } from 'crypto';

@Injectable()
export class FilesService {
  constructor(
    private readonly messagesService: MessagesProducerService,
    @InjectModel(FileTask.name) private readonly fileTaskModel: TaskModel,
    @InjectModel(Group.name) private readonly groupModel: GroupModel,
  ) {}

  async startDownload(fileDownloadDTO: FileDownloadDto) {
    const sensorIds = idToObjectID(fileDownloadDTO.ids);

    if (isNil(sensorIds)) {
      throw new BadRequestException('Invalid sensor ID provided!');
    }

    const downloadDTO = { ...fileDownloadDTO, ids: sensorIds };
    return await this.createFileTaskEntity(downloadDTO);
  }

  async find(
    options: FileTaskSearchOptions,
  ): Promise<TaskDocument[] | undefined> {
    const searchOptions = remapIDAndRemoveNil(options);
    if (hasNoOwnKeys(searchOptions)) {
      return undefined;
    }

    return this.fileTaskModel.find(searchOptions).exec();
  }

  async findOne(id: string): Promise<TaskDocument | undefined> {
    const objectId = idToObjectID(id);
    if (isNil(objectId)) {
      return undefined;
    }
    return await this.fileTaskModel.findById(objectId).exec();
  }

  update(id: number, updateFileDto: UpdateFileDto) {
    return `This action updates a #${id} file`;
  }

  remove(id: number) {
    return `This action removes a #${id} file`;
  }

  private async createFileTaskEntity(
    fileDownloadDTO: Omit<FileDownloadDto, 'ids'> & { ids: Types.ObjectId[] },
  ): Promise<TaskDocument | undefined> {
    switch (fileDownloadDTO.type) {
      case 'GROUP': {
        const groupSensorIds = (
          await this.groupModel
            .findById(fileDownloadDTO.ids[0])
            .select({ sensors: 1 })
            .exec()
        ).toObject().sensors as unknown as Types.ObjectId[];

        const sensorsWithFilenames = groupSensorIds.map((sensor, index) => ({
          sensor,
          filename:
            fileDownloadDTO.fileNames?.[index] ??
            `sensor_datafile-${randomUUID()}`,
        }));

        return await this.fileTaskModel.create({
          status: TaskSteps.NOT_STARTED,
          name: fileDownloadDTO.taskName,
          data: {
            dateFrom: fileDownloadDTO.dateFrom,
            dateTo: fileDownloadDTO.dateTo,
            groupId: fileDownloadDTO.ids[0],
            sensorData: sensorsWithFilenames,
          },
        });
      }
      case 'SENSOR': {
        const sensorsWithFilenames = fileDownloadDTO.ids.map(
          (sensor, index) => ({
            sensor,
            filename:
              fileDownloadDTO.fileNames?.[index] ??
              `sensor_datafile-${randomUUID()}`,
          }),
        );

        return await this.fileTaskModel.create({
          status: TaskSteps.NOT_STARTED,
          name: fileDownloadDTO.taskName,
          data: {
            dateFrom: fileDownloadDTO.dateFrom,
            dateTo: fileDownloadDTO.dateTo,
            sensorData: sensorsWithFilenames,
          },
        });
      }
      default:
        return undefined;
    }
  }
}

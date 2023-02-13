import { Injectable } from '@nestjs/common';
import { UpdateFileDto } from './dto/update-file.dto';
import { MessagesProducerService } from '../messages/messages-producer.service';
import {
  FileDownloadDto,
  FileDownloadEntityDto,
} from './dto/file-download.dto';
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

@Injectable()
export class FilesService {
  constructor(
    private readonly messagesService: MessagesProducerService,
    @InjectModel(FileTask.name) private readonly fileTaskModel: TaskModel,
    @InjectModel(Group.name) private readonly groupModel: GroupModel,
  ) {}

  async startDownload(fileDownloadDTO: FileDownloadDto) {
    const entities = fileDownloadDTO.entities.map(
      (entity): Omit<FileDownloadEntityDto, 'id'> & { id: Types.ObjectId } => ({
        ...entity,
        id: idToObjectID(entity.id),
      }),
    );

    const downloadDTO = { ...fileDownloadDTO, entities };
    const entity = await this.createFileTaskEntity(downloadDTO);
    await entity.populate('data.sensorData.sensor');
    this.messagesService.sendFileDownloadScheduledMessage({
      taskId: entity._id.toString(),
      dateTo: fileDownloadDTO.dateTo.toISOString(),
      dateFrom: fileDownloadDTO.dateFrom.toISOString(),
      sensors: entity.toObject().data.sensorData.map((sensorData) => ({
        id: sensorData.sensor._id.toString(),
        managedObjectId: sensorData.sensor.managedObjectId.toString(),
        fragmentType: sensorData.sensor.valueFragmentType,
        fileName: sensorData.fileName,
      })),
      credentials: {
        username: process.env.CUMU_USERNAME,
        password: process.env.CUMU_PASSWORD,
        tenantID: process.env.CUMU_TENANT_ID,
        tenantURL: process.env.CUMU_BASE_ADDRESS,
      },
    });

    return entity;
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
    fileDownloadDTO: Omit<FileDownloadDto, 'entities'> & {
      entities: (Omit<FileDownloadEntityDto, 'id'> & { id: Types.ObjectId })[];
    },
  ): Promise<TaskDocument | undefined> {
    switch (fileDownloadDTO.type) {
      case 'GROUP': {
        const groupSensorIds = (
          await this.groupModel
            .findById(fileDownloadDTO.entities[0].id)
            .select({ sensors: 1 })
            .exec()
        ).toObject().sensors as unknown as Types.ObjectId[];

        const sensorsWithFilenames = groupSensorIds.map((sensor) => ({
          sensor,
          filename: fileDownloadDTO.entities[0].fileName,
        }));

        return await this.fileTaskModel.create({
          status: TaskSteps.NOT_STARTED,
          name: fileDownloadDTO.taskName,
          data: {
            dateFrom: fileDownloadDTO.dateFrom,
            dateTo: fileDownloadDTO.dateTo,
            groupId: fileDownloadDTO.entities[0].id,
            sensorData: sensorsWithFilenames,
          },
        });
      }
      case 'SENSOR': {
        const sensorsWithFilenames = fileDownloadDTO.entities.map((entity) => ({
          sensor: entity.id,
          fileName: entity.fileName,
        }));

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

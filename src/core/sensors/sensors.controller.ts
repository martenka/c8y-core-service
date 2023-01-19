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
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import { UpdateSensorDto } from './dto/update-sensor.dto';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { SetControllerDTO } from '../../decorators/dto';
import { OutputSensorDto } from './dto/output-sensor.dto';
import { SensorDocument } from '../../models/Sensor';
import { SensorSearchOptions } from '../../models/types/types';
import { UpdateGroupDto } from '../groups/dto/update-group.dto';

@Controller('sensors')
@UseInterceptors(DtoTransformInterceptor)
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @SetControllerDTO(OutputSensorDto)
  async createSensor(
    @Body(new ParseArrayPipe({ items: CreateSensorDto }))
    createSensorDtos: CreateSensorDto[],
  ): Promise<SensorDocument[] | undefined> {
    return await this.sensorsService.createSensors(createSensorDtos);
  }

  @Get()
  @SetControllerDTO(OutputSensorDto)
  async searchSensors(
    @Query('id') id?: string,
    @Query('managedObjectId') managedObjectId?: string,
    @Query('managedObjectName') managedObjectName?: string,
    @Query('valueFragmentType') valueFragmentType?: string,
    @Query('valueFragmentDisplayName') valueFragmentDisplayName?: string,
  ): Promise<SensorDocument | SensorDocument[] | undefined> {
    const options: SensorSearchOptions = {
      id,
      managedObjectId,
      managedObjectName,
      valueFragmentType,
      valueFragmentDisplayName,
    };

    return await this.sensorsService.findMany(options);
  }

  @Get(':id')
  @SetControllerDTO(OutputSensorDto)
  async findOne(@Param('id') id: string): Promise<SensorDocument | undefined> {
    return this.sensorsService.findOne({ id });
  }

  @Patch()
  @SetControllerDTO(OutputSensorDto)
  async update(
    @Body(new ParseArrayPipe({ items: UpdateGroupDto }))
    updateSensorDtos: UpdateSensorDto[],
  ) {
    return this.sensorsService.updateSensors(updateSensorDtos);
  }

  @Delete(':id')
  @SetControllerDTO(OutputSensorDto)
  async remove(@Param('id') id: string) {
    return await this.sensorsService.removeSensor(id);
  }
}

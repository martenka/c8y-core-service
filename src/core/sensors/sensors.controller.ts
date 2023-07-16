import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseArrayPipe,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { SensorsService } from './sensors.service';
import { CreateSensorDto } from './dto/create-sensor.dto';
import {
  UpdateOneSensorDto,
  UpdateSensorsAttributesDto,
  UpdateSensorDto,
  DeleteSensorAttributesDto,
} from './dto/update-sensor.dto';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { NoDTOValidation, SetControllerDTO } from '../../decorators/dto';
import {
  OutputSensorDto,
  PaginatedOutputSensorDto,
} from './dto/output-sensor.dto';
import { Sensor, SensorDocument } from '../../models/Sensor';
import { DBPagingResult } from '../../global/pagination/types';
import { SensorQuery } from './query/sensor-query.dto';
import { PagingQuery } from '../../global/pagination/pagination.dto';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { AdminRoute } from '../../decorators/authorization';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { removeNilProperties } from '../../utils/helpers';
import { Types } from 'mongoose';
import { MongoIdTransformPipe } from '../../pipes/mongo-id.pipe';

@Controller('sensors')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @AdminRoute()
  @SetControllerDTO(OutputSensorDto, { apiResponseOptions: { status: 201 } })
  @ApiTags('sensors')
  @ApiOperation({ operationId: 'Create a new sensor' })
  @ApiBody({ type: [CreateSensorDto] })
  async createSensor(
    @Body(new ParseArrayPipe({ items: CreateSensorDto }))
    createSensorDtos: CreateSensorDto[],
  ): Promise<SensorDocument[] | undefined> {
    return await this.sensorsService.createSensors(createSensorDtos);
  }

  @Get('/search')
  @SetControllerDTO(PaginatedOutputSensorDto)
  @ApiTags('sensors')
  @ApiOperation({ operationId: 'Search sensors' })
  async searchSensors(
    @Query() searchQuery: SensorQuery,
    @Query() pagingQuery: PagingQuery,
  ): Promise<DBPagingResult<Sensor> | undefined> {
    return await this.sensorsService.findMany(searchQuery, pagingQuery);
  }

  @Get(':id')
  @SetControllerDTO(OutputSensorDto)
  @ApiTags('sensors')
  @ApiOperation({ operationId: 'Get one sensor' })
  async findOne(@Param('id') id: string): Promise<SensorDocument | undefined> {
    return this.sensorsService.findOne({ id });
  }

  @Patch('/attributes')
  @HttpCode(200)
  @AdminRoute()
  @NoDTOValidation()
  @ApiTags('sensors')
  @ApiOperation({
    operationId: 'Update sensors attributes found by identifiers',
    description: `Upsert the same attributes to many sensors (e.g same custom attribute) that are identified by the given identifier. 
       Doesn't overwrite existing not specified custom attributes keys already present on the entity`,
  })
  async updateAttributesByIdentifiers(
    @Body()
    updateDto: UpdateSensorsAttributesDto,
  ): Promise<void> {
    if (Object.keys(removeNilProperties(updateDto.identifiers)).length === 0) {
      throw new BadRequestException(
        'At least one sensor identifier must be provided!',
      );
    }

    await this.sensorsService.updateSensorsByCommonIdentifiers(updateDto);
  }

  @Post('/attributes/delete')
  @HttpCode(200)
  @AdminRoute()
  @NoDTOValidation()
  @ApiTags('sensors')
  @ApiOperation({
    operationId: 'Remove attributes from sensors found by identifiers.',
    description: 'Specifying a boolean true for attribute removes its value',
  })
  async removeAttributesByIdentifiers(
    @Body()
    updateDto: DeleteSensorAttributesDto,
  ): Promise<void> {
    if (Object.keys(removeNilProperties(updateDto.identifiers)).length === 0) {
      throw new BadRequestException(
        'At least one sensor identifier must be provided!',
      );
    }

    await this.sensorsService.removeSensorAttributesByCommonIdentifiers(
      updateDto,
    );
  }
  @Patch(':id')
  @AdminRoute()
  @SetControllerDTO(OutputSensorDto)
  @ApiTags('sensors')
  @ApiOperation({
    operationId: 'Update one sensor. Overwrites attribute if given',
  })
  async updateOne(
    @Body()
    updateSensorDto: UpdateOneSensorDto,
    @Param('id', MongoIdTransformPipe) id: Types.ObjectId,
  ): Promise<SensorDocument | undefined> {
    return await this.sensorsService.updateOne(id, updateSensorDto);
  }

  @Patch()
  @AdminRoute()
  @SetControllerDTO(OutputSensorDto, { isArray: true })
  @ApiTags('sensors')
  @ApiOperation({ operationId: 'Update sensors' })
  @ApiBody({ type: [UpdateSensorDto] })
  async update(
    @Body(new ParseArrayPipe({ items: UpdateSensorDto }))
    updateSensorDtos: UpdateSensorDto[],
  ): Promise<SensorDocument[]> {
    return this.sensorsService.updateSensors(updateSensorDtos);
  }

  @Delete(':id')
  @AdminRoute()
  @ApiTags('sensors')
  @ApiOperation({ operationId: 'Delete sensor' })
  async remove(@Param('id') id: string) {
    await this.sensorsService.removeSensor(id);
  }
}

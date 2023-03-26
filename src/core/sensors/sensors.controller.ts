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

@Controller('sensors')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class SensorsController {
  constructor(private readonly sensorsService: SensorsService) {}

  @Post()
  @AdminRoute()
  @SetControllerDTO(OutputSensorDto)
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
  @SetControllerDTO(OutputSensorDto)
  @ApiTags('sensors')
  @ApiOperation({ operationId: 'Delete sensor' })
  async remove(@Param('id') id: string) {
    return await this.sensorsService.removeSensor(id);
  }
}

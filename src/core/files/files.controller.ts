import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  Query,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { UpdateFileDto } from './dto/update-file.dto';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { FileDownloadDto } from './dto/file-download.dto';
import { SetControllerDTO } from '../../decorators/dto';
import { OutputFileDto } from './dto/output-file.dto';
import { TaskDocument } from '../../models/FileTask';

@Controller('files')
@UseInterceptors(DtoTransformInterceptor)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('/downloads')
  @SetControllerDTO(OutputFileDto)
  async startDownload(
    @Body() fileDownloadDto: FileDownloadDto,
  ): Promise<TaskDocument | undefined> {
    return await this.filesService.startDownload(fileDownloadDto);
  }

  @Get('/downloads')
  @SetControllerDTO(OutputFileDto)
  async find(
    @Query('status') status?: string,
    @Query('name') name?: string,
    @Query('type') type?: string,
  ): Promise<TaskDocument[] | undefined> {
    return await this.filesService.find({ status, name, type });
  }

  @Get('/downloads/:id')
  @SetControllerDTO(OutputFileDto)
  async findOne(@Param('id') id: string): Promise<TaskDocument | undefined> {
    return await this.filesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(+id, updateFileDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.filesService.remove(+id);
  }
}

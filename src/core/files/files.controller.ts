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
import { OutputFileDto, PaginatedOutputFileDto } from './dto/output-file.dto';
import { FileTask, FileTaskDocument } from '../../models/FileTask';
import { FileTaskQuery } from './query/query.file';
import { DBPagingResult } from '../../global/pagination/types';
import { PagingQuery } from '../../global/pagination/pagination';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { AdminRoute } from '../../decorators/authorization';

@Controller('files')
@UseInterceptors(DtoTransformInterceptor)
@UseRolesGuard()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('/downloads')
  @AdminRoute()
  @SetControllerDTO(OutputFileDto)
  async startDownload(
    @Body() fileDownloadDto: FileDownloadDto,
  ): Promise<FileTaskDocument | undefined> {
    return await this.filesService.startDownload(fileDownloadDto);
  }

  @Get('/downloads')
  @SetControllerDTO(PaginatedOutputFileDto)
  async find(
    @Query() searchQuery: FileTaskQuery,
    @Query() pagingQuery: PagingQuery,
  ): Promise<DBPagingResult<FileTask> | undefined> {
    return await this.filesService.find(searchQuery, pagingQuery);
  }

  @Get('/downloads/:id')
  @SetControllerDTO(OutputFileDto)
  async findOne(
    @Param('id') id: string,
  ): Promise<FileTaskDocument | undefined> {
    return await this.filesService.findOne(id);
  }

  @Patch(':id')
  @AdminRoute()
  update(@Param('id') id: string, @Body() updateFileDto: UpdateFileDto) {
    return this.filesService.update(+id, updateFileDto);
  }

  @Delete(':id')
  @AdminRoute()
  remove(@Param('id') id: string) {
    return this.filesService.remove(+id);
  }
}

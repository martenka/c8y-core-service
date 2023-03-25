import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { PagingQuery } from '../../global/pagination/pagination.dto';
import { DBPagingResult } from '../../global/pagination/types';
import { File, FileDocument } from '../../models';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import { SetControllerDTO, SetExposeGroups } from '../../decorators/dto';
import { Groups } from '../../global/tokens';
import { idToObjectID } from '../../utils/helpers';
import { isNil } from '@nestjs/common/utils/shared.utils';
import { OutputFileDto, PaginatedOutputFileDto } from './dto/output-file.dto';
import { FileQueryDto } from './query/file-query.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@Controller('files')
@UseInterceptors(DtoTransformInterceptor)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('/search')
  @SetControllerDTO(PaginatedOutputFileDto)
  @ApiTags('files')
  @ApiOperation({ operationId: 'Search files' })
  async searchFiles(
    @Query() searchQuery: FileQueryDto,
    @Query() pagingQuery: PagingQuery,
  ): Promise<DBPagingResult<File>> {
    return await this.filesService.findMany(searchQuery, pagingQuery);
  }

  @Get(':id')
  @SetExposeGroups(Groups.ALL)
  @SetControllerDTO(OutputFileDto)
  @ApiTags('files')
  @ApiOperation({ operationId: 'Get one file' })
  async getFileDetails(
    @Param('id') id: string,
  ): Promise<FileDocument | undefined> {
    const fileId = idToObjectID(id);
    if (isNil(fileId)) {
      throw new NotFoundException();
    }
    return this.filesService.findById(fileId);
  }
}

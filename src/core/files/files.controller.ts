import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { FilesService } from './files.service';
import { PagingQuery } from '../../global/pagination/pagination.dto';
import { DBPagingResult } from '../../global/pagination/types';
import { File, FileDocument } from '../../models';
import { DtoTransformInterceptor } from '../../interceptors/dto-transform.interceptor';
import {
  NoDTOValidation,
  SetControllerDTO,
  SetExposeGroups,
} from '../../decorators/dto';
import { Groups } from '../../global/tokens';
import { idToObjectIDOrUndefined } from '../../utils/helpers';
import { OutputFileDto, PaginatedOutputFileDto } from './dto/output-file.dto';
import { FileQuery } from './query/file-query.dto';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { FileLink } from './types/types';
import { AdminRoute } from '../../decorators/authorization';
import { DeleteInputDto } from '../../global/dto/deletion';
import { MongoIdTransformPipe } from '../../pipes/mongo-id.pipe';
import { Types } from 'mongoose';
import { VisibilityStateDto } from './dto/visibility-state.dto';
import { FileUploadSuitabilityQueryDto } from './query/upload-suitability-query.dto';
import { LoggedInUser } from '../../decorators/user';
import { LoggedInUserType } from '../auth/types/types';
import { Role } from '../../global/types/roles';
import { UseRolesGuard } from '../../guards/RoleGuard';
import { notPresent } from '../../utils/validation';

@Controller('files')
@UseRolesGuard()
@UseInterceptors(DtoTransformInterceptor)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('/upload-readiness')
  @NoDTOValidation()
  @ApiTags('files')
  @ApiOperation({
    operationId: 'Check for files upload readiness to external system',
  })
  async getFilesUnsuitableForUpload(
    @Query() filesToCheck: FileUploadSuitabilityQueryDto,
  ) {
    return await this.filesService.getFilesUnsuitableForUpload(
      filesToCheck.fileIds,
    );
  }

  @Get('/search')
  @SetControllerDTO(PaginatedOutputFileDto)
  @ApiTags('files')
  @ApiOperation({ operationId: 'Search files' })
  async searchFiles(
    @Query() searchQuery: FileQuery,
    @Query() pagingQuery: PagingQuery,
    @LoggedInUser() user: LoggedInUserType,
  ): Promise<DBPagingResult<File>> {
    return await this.filesService.findMany(
      searchQuery,
      pagingQuery,
      user.roles.includes(Role.Admin),
    );
  }

  @Get(':id')
  @SetExposeGroups(Groups.ALL)
  @SetControllerDTO(OutputFileDto)
  @ApiTags('files')
  @ApiOperation({ operationId: 'Get one file' })
  async getFileDetails(
    @Param('id') id: string,
    @LoggedInUser() user: LoggedInUserType,
  ): Promise<FileDocument | undefined> {
    const fileId = idToObjectIDOrUndefined(id);
    if (notPresent(fileId)) {
      throw new NotFoundException();
    }
    return await this.filesService.findById(
      fileId,
      user.roles.includes(Role.Admin),
    );
  }

  @Get(':id/link')
  @SetExposeGroups(Groups.ALL)
  @NoDTOValidation()
  @ApiTags('files')
  @ApiOperation({ operationId: 'Get file download link' })
  @ApiOkResponse({
    schema: {
      required: ['id', 'url'],
      properties: {
        id: { type: 'string', description: 'File ID' },
        url: { type: 'string' },
        fileName: { type: 'string' },
      },
    },
  })
  async getFileLink(
    @Param('id') id: string,
    @LoggedInUser() user: LoggedInUserType,
  ): Promise<FileLink | undefined> {
    const fileId = idToObjectIDOrUndefined(id);
    if (notPresent(fileId)) {
      throw new NotFoundException();
    }
    return await this.filesService.getFileLink(
      fileId,
      user.roles.includes(Role.Admin),
    );
  }

  @Post(':id/visibility-state')
  @AdminRoute()
  @SetExposeGroups(Groups.ALL)
  @SetControllerDTO(OutputFileDto)
  @HttpCode(200)
  @ApiTags('files')
  @ApiOperation({ operationId: 'Change file visibility state' })
  async setFileVisibilityState(
    @Param('id', MongoIdTransformPipe) id: Types.ObjectId,
    @Body() visibilityStateDto: VisibilityStateDto,
    @LoggedInUser() user: LoggedInUserType,
  ): Promise<FileDocument | undefined> {
    return await this.filesService.handleFileVisibilityChangeRequest(
      id,
      visibilityStateDto,
      user.roles.includes(Role.Admin),
    );
  }

  @Post('/delete')
  @AdminRoute()
  @HttpCode(HttpStatus.OK)
  @NoDTOValidation()
  @ApiTags('files')
  @ApiOperation({ operationId: 'Remove files' })
  async deleteFiles(@Body() deleteEntityDto: DeleteInputDto) {
    await this.filesService.removeMany(deleteEntityDto);
  }

  @Delete(':id')
  @AdminRoute()
  @NoDTOValidation()
  @ApiTags('files')
  @ApiOperation({ operationId: 'Delete file' })
  @ApiParam({ type: 'string', name: 'id' })
  async deleteFile(
    @Param('id', MongoIdTransformPipe) id: Types.ObjectId,
  ): Promise<void> {
    await this.filesService.removeFile(id);
  }
}

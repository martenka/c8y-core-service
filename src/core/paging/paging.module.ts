import { Module } from '@nestjs/common';
import { SkipPagingService } from './skip-paging.service';

@Module({
  providers: [SkipPagingService],
  exports: [SkipPagingService],
})
export class PagingModule {}

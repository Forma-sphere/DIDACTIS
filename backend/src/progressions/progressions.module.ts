import { Module } from '@nestjs/common';
import { ProgressionsController } from './progressions.controller';
import { ProgressionsService } from './progressions.service';

@Module({
  controllers: [ProgressionsController],
  providers: [ProgressionsService],
  exports: [ProgressionsService],
})
export class ProgressionsModule {}

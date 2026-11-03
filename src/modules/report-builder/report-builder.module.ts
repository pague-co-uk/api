import { Module } from '@nestjs/common';
import { ReportBuilderController } from './report-builder.controller.js';
import { ReportBuilderService } from './report-builder.service.js';

@Module({
  controllers: [ReportBuilderController],
  providers: [ReportBuilderService],
})
export class ReportBuilderModule {}

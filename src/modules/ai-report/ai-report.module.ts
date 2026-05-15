import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AiReportController } from './ai-report.controller';
import { AiReportQueueService } from './ai-report-queue.service';
import { AiReportService } from './ai-report.service';
import { AiReportGenerationService } from './ai-report-generation.service';
import { AiReport } from './entities/ai-report.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AiReport])],
  controllers: [AiReportController],
  providers: [AiReportService, AiReportQueueService, AiReportGenerationService],
  exports: [AiReportQueueService],
})
export class AiReportModule {}

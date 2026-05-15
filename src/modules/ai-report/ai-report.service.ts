import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiReport, AiReportStatus } from './entities/ai-report.entity';

@Injectable()
export class AiReportService {
  constructor(
    @InjectRepository(AiReport)
    private readonly aiReportRepo: Repository<AiReport>,
  ) {}

  async getStatus(userId: string): Promise<{
    status: AiReportStatus;
    estimatedSecondsRemaining?: number;
  }> {
    const report = await this.aiReportRepo.findOneBy({ user_id: userId });
    if (!report) {
      return { status: AiReportStatus.PENDING };
    }

    const result: { status: AiReportStatus; estimatedSecondsRemaining?: number } = {
      status: report.status,
    };

    if (report.status === AiReportStatus.GENERATING) {
      result.estimatedSecondsRemaining = 30;
    }

    return result;
  }

  async getReport(userId: string) {
    const report = await this.aiReportRepo.findOneBy({ user_id: userId });

    if (!report || report.status === AiReportStatus.PENDING || report.status === AiReportStatus.GENERATING) {
      throw new NotFoundException(
        'Report is not ready yet. Poll /ai-report/status until status is "ready" or "failed".',
      );
    }

    return {
      tier: report.tier,
      score: report.score,
      generatedBy: report.generated_by,
      ...(report.payload ?? {}),
      ...(report.retake_eligible_at
        ? { retakeEligibleAt: report.retake_eligible_at }
        : {}),
    };
  }
}

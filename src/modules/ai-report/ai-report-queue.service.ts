import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue, Worker } from 'bullmq';
import { Repository } from 'typeorm';
import { redisQueueConnection } from '../../shared/runtime/redis-queue';
import { AiReportGenerationService, GenerationContext } from './ai-report-generation.service';
import {
  AiReport,
  AiReportStatus,
  AiReportTier,
} from './entities/ai-report.entity';

const QUEUE_NAME = 'ai-report-generation';
const MAX_ATTEMPTS = 3;
const RETAKE_GATE_DAYS = 14;

export interface AiReportJobData {
  userId: string;
  score: number;
  tier: AiReportTier;
  track?: string;
  specialisation?: string;
  validatedLevel?: string;
}

@Injectable()
export class AiReportQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AiReportQueueService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    @InjectRepository(AiReport)
    private readonly aiReportRepo: Repository<AiReport>,
    private readonly generationService: AiReportGenerationService,
  ) {}

  onModuleInit(): void {
    const conn = redisQueueConnection();
    if (!conn) {
      this.logger.log(
        'REDIS_URL not set — AI report generation runs inline after the request returns',
      );
      return;
    }

    this.queue = new Queue(QUEUE_NAME, { connection: conn });
    this.worker = new Worker(
      QUEUE_NAME,
      async (job) => {
        const data = job.data as AiReportJobData;
        await this.processGeneration(data);
      },
      { connection: conn },
    );

    this.worker.on('failed', (job, err) => {
      this.logger.error(
        `AI report job ${job?.id} failed`,
        err instanceof Error ? err.stack : err,
      );
    });
  }

  async enqueue(data: AiReportJobData): Promise<void> {
    await this.upsertPending(data);

    const conn = redisQueueConnection();
    if (!conn) {
      setImmediate(() => {
        void this.processGeneration(data).catch((err: unknown) => {
          this.logger.error(
            'Inline AI report generation failed',
            err instanceof Error ? err.stack : err,
          );
        });
      });
      return;
    }

    await this.queue!.add(QUEUE_NAME, data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: MAX_ATTEMPTS,
      backoff: { type: 'exponential', delay: 3000 },
    }).catch((err: unknown) => {
      this.logger.error(
        'Failed to enqueue AI report job',
        err instanceof Error ? err.stack : err,
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
    await this.queue?.close();
  }

  private async upsertPending(data: AiReportJobData): Promise<void> {
    const retakeEligibleAt =
      data.tier === AiReportTier.EMERGING
        ? new Date(Date.now() + RETAKE_GATE_DAYS * 24 * 60 * 60 * 1000)
        : null;

    await this.aiReportRepo.upsert(
      {
        user_id: data.userId,
        status: AiReportStatus.PENDING,
        tier: data.tier,
        score: data.score,
        generated_by: null,
        payload: null,
        attempt_count: 0,
        retake_eligible_at: retakeEligibleAt,
      },
      { conflictPaths: ['user_id'] },
    );
  }

  private async processGeneration(data: AiReportJobData): Promise<void> {
    const report = await this.aiReportRepo.findOneBy({ user_id: data.userId });
    if (!report) return;

    await this.aiReportRepo.update(report.id, {
      status: AiReportStatus.GENERATING,
      attempt_count: () => 'attempt_count + 1',
    });

    const ctx: GenerationContext = {
      userId: data.userId,
      score: data.score,
      tier: data.tier,
      track: data.track,
      specialisation: data.specialisation,
      validatedLevel: data.validatedLevel,
    };

    const { payload, generatedBy } = await this.generationService.generate(ctx);

    await this.aiReportRepo.update(report.id, {
      status: AiReportStatus.READY,
      payload,
      generated_by: generatedBy,
    });

    this.logger.log(
      `AI report generated for user ${data.userId} [${generatedBy}] tier=${data.tier} score=${data.score}`,
    );
  }
}

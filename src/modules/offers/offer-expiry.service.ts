import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, LessThan, Repository } from 'typeorm';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { User } from '../users/entities/user.entity';
import { Offer, OfferStatus } from './entities/offer.entity';

const EXPIRY_POLL_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class OfferExpiryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OfferExpiryService.name);
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationDispatch: NotificationDispatchService,
  ) {}

  onModuleInit(): void {
    void this.processExpiryEvents();
    this.pollTimer = setInterval(
      () => void this.processExpiryEvents(),
      EXPIRY_POLL_MS,
    );
  }

  onModuleDestroy(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async processExpiryEvents(): Promise<void> {
    await Promise.all([
      this.expireAssessmentWindows(),
      this.sendExpiryWarnings(),
    ]);
  }

  private async expireAssessmentWindows(): Promise<void> {
    const now = new Date();

    // Fetch ASSESSMENT_UNLOCKED offers whose deadline has passed
    const overdueOffers = await this.offerRepo.find({
      where: {
        status: OfferStatus.ASSESSMENT_UNLOCKED,
        assessment_deadline: LessThan(now),
      },
      select: ['id', 'employer_user_id', 'candidate_user_id', 'role_title'],
    });

    for (const offer of overdueOffers) {
      const updated = await this.offerRepo.update(
        { id: offer.id, status: OfferStatus.ASSESSMENT_UNLOCKED },
        { status: OfferStatus.EXPIRED },
      );

      if (!updated.affected || updated.affected === 0) {
        // Another process already transitioned this offer
        continue;
      }

      // Notify employer
      try {
        const candidate = await this.userRepo.findOne({
          where: { id: offer.candidate_user_id },
          select: ['id', 'first_name', 'last_name'],
        });
        const candidateName = candidate
          ? `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
          : 'A candidate';

        await this.notificationDispatch.notifyOfferExpired(
          offer.employer_user_id,
          {
            offerId: offer.id,
            candidateUserId: offer.candidate_user_id,
            candidateName,
            roleTitle: offer.role_title,
          },
        );
      } catch (error: unknown) {
        this.logger.error(
          `Expiry notification failed offer=${offer.id}: ${String(error)}`,
        );
      }
    }
  }

  private async sendExpiryWarnings(): Promise<void> {
    const now = new Date();
    const warningCutoff = new Date(now.getTime() + WARNING_WINDOW_MS);

    // Find ASSESSMENT_UNLOCKED offers expiring within the next 24 hours
    // that have not yet had a warning sent
    const expiringOffers = await this.offerRepo.find({
      where: {
        status: OfferStatus.ASSESSMENT_UNLOCKED,
        assessment_deadline: Between(now, warningCutoff),
        expiry_warning_sent_at: IsNull(),
      },
      select: [
        'id',
        'employer_user_id',
        'candidate_user_id',
        'role_title',
        'assessment_deadline',
      ],
    });

    for (const offer of expiringOffers) {
      // Mark the warning as sent atomically before dispatching to prevent
      // duplicate warnings on concurrent poll cycles
      const marked = await this.offerRepo.update(
        {
          id: offer.id,
          status: OfferStatus.ASSESSMENT_UNLOCKED,
          expiry_warning_sent_at: IsNull(),
        },
        { expiry_warning_sent_at: now },
      );

      if (!marked.affected || marked.affected === 0) {
        continue;
      }

      try {
        const candidate = await this.userRepo.findOne({
          where: { id: offer.candidate_user_id },
          select: ['id', 'first_name', 'last_name'],
        });
        const candidateName = candidate
          ? `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
          : 'A candidate';

        await this.notificationDispatch.notifyAssessmentWindowExpiring(
          offer.employer_user_id,
          {
            offerId: offer.id,
            candidateUserId: offer.candidate_user_id,
            candidateName,
            roleTitle: offer.role_title,
            assessmentDeadline: offer.assessment_deadline!.toISOString(),
          },
        );
      } catch (error: unknown) {
        this.logger.error(
          `Expiry warning notification failed offer=${offer.id}: ${String(error)}`,
        );
      }
    }
  }
}

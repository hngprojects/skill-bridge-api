import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
} from '../../shared';
import { EmployerPoolProfile } from '../talent/entities/employer-pool-profile.entity';
import { EmployerProfile } from '../employer/entities/employer-profile.entity';
import { User } from '../users/entities/user.entity';
import { NotificationDispatchService } from '../notifications/notification-dispatch.service';
import { NotificationType } from '../notifications/notification-type.enum';
import { EmployerVerificationService } from '../employer/employer-verification.service';
import { Offer, OfferStatus } from './entities/offer.entity';
import { OfferDistributionLog } from './entities/offer-distribution-log.entity';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';

const DEFAULT_MONTHLY_CAP = 50;

export type OfferListResult = {
  offers: Offer[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type EnrichedOffer = Offer & {
  is_employer_verified: boolean;
};

export type EnrichedOfferListResult = {
  offers: EnrichedOffer[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
};

export type OfferAnalytics = {
  offers_this_month: number;
  monthly_cap: number;
  remaining: number;
  accepted_count: number;
  declined_count: number;
  pending_count: number;
  expired_count: number;
};

@Injectable()
export class OffersService {
  private readonly logger = new Logger(OffersService.name);
  private readonly monthlyCap: number;

  constructor(
    @InjectRepository(Offer)
    private readonly offerRepo: Repository<Offer>,
    @InjectRepository(OfferDistributionLog)
    private readonly distributionLogRepo: Repository<OfferDistributionLog>,
    @InjectRepository(EmployerPoolProfile)
    private readonly poolProfileRepo: Repository<EmployerPoolProfile>,
    @InjectRepository(EmployerProfile)
    private readonly employerProfileRepo: Repository<EmployerProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notificationDispatch: NotificationDispatchService,
    private readonly verificationService: EmployerVerificationService,
  ) {
    this.monthlyCap =
      parseInt(process.env.OFFERS_MONTHLY_CAP ?? '', 10) || DEFAULT_MONTHLY_CAP;
  }

  async createOffer(
    employerUserId: string,
    dto: CreateOfferDto,
  ): Promise<Offer> {
    await this.verificationService.assertEmployerVerified(employerUserId);

    // Validate candidate is Job Ready
    const poolProfile = await this.poolProfileRepo.findOne({
      where: { candidate_id: dto.candidate_user_id },
    });

    if (!poolProfile) {
      throw new NotFoundError('Candidate not found');
    }

    if (poolProfile.tier !== 'job_ready') {
      throw new ForbiddenError(
        'Offers can only be sent to Job Ready candidates',
      );
    }

    // Enforce send-cap atomically via transaction
    const expiresInDays = dto.expires_in_days ?? 14;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const offer = await this.offerRepo.manager.transaction(async (manager) => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0,
        23,
        59,
        59,
        999,
      );
      const monthlyCount = await manager.count(OfferDistributionLog, {
        where: {
          employer_user_id: employerUserId,
          sent_at: Between(startOfMonth, endOfMonth),
        },
      });

      if (monthlyCount >= this.monthlyCap) {
        throw new TooManyRequestsError(
          `Monthly offer limit reached (${this.monthlyCap}). Try again next month.`,
        );
      }

      const created = await manager.save(Offer, {
        employer_user_id: employerUserId,
        candidate_user_id: dto.candidate_user_id,
        employer_pool_profile_id: poolProfile.id,
        role_title: dto.role_title,
        message: dto.message,
        status: OfferStatus.PENDING,
        expires_at: expiresAt,
      } as Partial<Offer>);

      await manager.save(OfferDistributionLog, {
        employer_user_id: employerUserId,
        offer_id: created.id,
      } as Partial<OfferDistributionLog>);

      return created;
    });

    // Notify candidate
    const employer = await this.userRepo.findOne({
      where: { id: employerUserId },
    });
    const employerName = employer
      ? `${employer.first_name ?? ''} ${employer.last_name ?? ''}`.trim()
      : 'An employer';

    try {
      await this.notificationDispatch.dispatch(
        NotificationType.OFFER_RECEIVED,
        dto.candidate_user_id,
        {
          offerId: offer.id,
          employerUserId,
          employerName,
          roleTitle: dto.role_title,
        },
      );
    } catch (error) {
      this.logger.error(
        `Offer notification failed offer=${offer.id}: ${String(error)}`,
      );
    }

    return offer;
  }

  async listEmployerOffers(
    employerUserId: string,
    query: ListOffersQueryDto,
  ): Promise<OfferListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Expire stale offers before querying to keep filter/pagination consistent
    await this.expireStaleOffers(employerUserId);

    const where: Record<string, unknown> = {
      employer_user_id: employerUserId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [offers, total] = await this.offerRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['candidate'],
    });

    return {
      offers,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async listCandidateOffers(
    candidateUserId: string,
    query: ListOffersQueryDto,
  ): Promise<EnrichedOfferListResult> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    // Expire stale offers before querying
    await this.expireStaleOffersForCandidate(candidateUserId);

    const where: Record<string, unknown> = {
      candidate_user_id: candidateUserId,
    };

    if (query.status) {
      where.status = query.status;
    }

    const [offers, total] = await this.offerRepo.findAndCount({
      where,
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      relations: ['employer'],
    });

    // Enrich with employer verification status
    const employerUserIds = [...new Set(offers.map((o) => o.employer_user_id))];
    const profiles = employerUserIds.length
      ? await this.employerProfileRepo.find({
          where: employerUserIds.map((id) => ({ user_id: id })),
          select: ['user_id', 'is_verified'],
        })
      : [];
    const verifiedMap = new Map(
      profiles.map((p) => [p.user_id, p.is_verified]),
    );

    const enrichedOffers = offers.map((offer) => ({
      ...offer,
      is_employer_verified: verifiedMap.get(offer.employer_user_id) ?? false,
    }));

    return {
      offers: enrichedOffers,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    };
  }

  async getOfferForEmployer(
    employerUserId: string,
    offerId: string,
  ): Promise<Offer> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, employer_user_id: employerUserId },
      relations: ['candidate'],
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    return this.checkAndUpdateExpiry(offer);
  }

  async getOfferForCandidate(
    candidateUserId: string,
    offerId: string,
  ): Promise<EnrichedOffer> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, candidate_user_id: candidateUserId },
      relations: ['employer'],
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    const checked = await this.checkAndUpdateExpiry(offer);
    const profile = await this.employerProfileRepo.findOne({
      where: { user_id: checked.employer_user_id },
      select: ['is_verified'],
    });

    return {
      ...checked,
      is_employer_verified: profile?.is_verified ?? false,
    };
  }

  async respondToOffer(
    candidateUserId: string,
    offerId: string,
    action: 'accept' | 'decline',
  ): Promise<Offer> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, candidate_user_id: candidateUserId },
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new BadRequestError(
        `Cannot respond to an offer with status: ${offer.status}`,
      );
    }

    const newStatus =
      action === 'accept' ? OfferStatus.ACCEPTED : OfferStatus.DECLINED;
    const respondedAt = new Date();

    // Atomic conditional update to prevent race conditions
    const result = await this.offerRepo.update(
      {
        id: offer.id,
        status: OfferStatus.PENDING,
        expires_at: LessThan(new Date()) as unknown as Date,
      },
      { status: OfferStatus.EXPIRED },
    );

    // If the offer was just expired by the above, throw
    if (result.affected && result.affected > 0) {
      throw new BadRequestError('This offer has expired');
    }

    // Now atomically set the response (only if still PENDING)
    const updateResult = await this.offerRepo.update(
      { id: offer.id, status: OfferStatus.PENDING },
      { status: newStatus, responded_at: respondedAt },
    );

    if (!updateResult.affected || updateResult.affected === 0) {
      throw new BadRequestError(
        `Cannot respond to an offer with status: ${offer.status}`,
      );
    }

    offer.status = newStatus;
    offer.responded_at = respondedAt;

    // Notify employer
    const notificationType =
      action === 'accept'
        ? NotificationType.OFFER_ACCEPTED
        : NotificationType.OFFER_DECLINED;

    const candidate = await this.userRepo.findOne({
      where: { id: candidateUserId },
    });
    const candidateName = candidate
      ? `${candidate.first_name ?? ''} ${candidate.last_name ?? ''}`.trim()
      : 'A candidate';

    try {
      await this.notificationDispatch.dispatch(
        notificationType,
        offer.employer_user_id,
        {
          offerId: offer.id,
          candidateUserId,
          candidateName,
          roleTitle: offer.role_title,
          action,
        },
      );
    } catch (error) {
      this.logger.error(
        `Offer response notification failed offer=${offer.id}: ${String(error)}`,
      );
    }

    return offer;
  }

  async getAnalytics(employerUserId: string): Promise<OfferAnalytics> {
    // Expire stale offers so counts reflect true statuses
    await this.expireStaleOffers(employerUserId);

    const monthlyCount = await this.getDistributionCount(employerUserId);

    const [acceptedCount, declinedCount, pendingCount, expiredCount] =
      await Promise.all([
        this.offerRepo.count({
          where: {
            employer_user_id: employerUserId,
            status: OfferStatus.ACCEPTED,
          },
        }),
        this.offerRepo.count({
          where: {
            employer_user_id: employerUserId,
            status: OfferStatus.DECLINED,
          },
        }),
        this.offerRepo.count({
          where: {
            employer_user_id: employerUserId,
            status: OfferStatus.PENDING,
          },
        }),
        this.offerRepo.count({
          where: {
            employer_user_id: employerUserId,
            status: OfferStatus.EXPIRED,
          },
        }),
      ]);

    return {
      offers_this_month: monthlyCount,
      monthly_cap: this.monthlyCap,
      remaining: Math.max(0, this.monthlyCap - monthlyCount),
      accepted_count: acceptedCount,
      declined_count: declinedCount,
      pending_count: pendingCount,
      expired_count: expiredCount,
    };
  }

  async markHireComplete(
    employerUserId: string,
    offerId: string,
  ): Promise<Offer> {
    const offer = await this.offerRepo.findOne({
      where: { id: offerId, employer_user_id: employerUserId },
    });

    if (!offer) {
      throw new NotFoundError('Offer not found');
    }

    if (offer.status !== OfferStatus.ACCEPTED) {
      throw new BadRequestError('Only accepted offers can be marked as hired');
    }

    await this.offerRepo.manager.transaction(async (manager) => {
      const result = await manager.update(
        Offer,
        { id: offer.id, status: OfferStatus.ACCEPTED },
        { status: OfferStatus.HIRED },
      );

      if (!result.affected || result.affected === 0) {
        throw new BadRequestError(
          'Only accepted offers can be marked as hired',
        );
      }

      await manager.increment(
        EmployerProfile,
        { user_id: employerUserId },
        'hire_count',
        1,
      );
    });

    offer.status = OfferStatus.HIRED;
    return offer;
  }

  private async getDistributionCount(employerUserId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return this.distributionLogRepo.count({
      where: {
        employer_user_id: employerUserId,
        sent_at: Between(startOfMonth, endOfMonth),
      },
    });
  }

  private async checkAndUpdateExpiry(offer: Offer): Promise<Offer> {
    if (offer.status === OfferStatus.PENDING && offer.expires_at < new Date()) {
      offer.status = OfferStatus.EXPIRED;
      await this.offerRepo.update(offer.id, {
        status: OfferStatus.EXPIRED,
      });
    }
    return offer;
  }

  private async expireStaleOffers(employerUserId: string): Promise<void> {
    await this.offerRepo.update(
      {
        employer_user_id: employerUserId,
        status: OfferStatus.PENDING,
        expires_at: LessThan(new Date()),
      },
      { status: OfferStatus.EXPIRED },
    );
  }

  private async expireStaleOffersForCandidate(
    candidateUserId: string,
  ): Promise<void> {
    await this.offerRepo.update(
      {
        candidate_user_id: candidateUserId,
        status: OfferStatus.PENDING,
        expires_at: LessThan(new Date()),
      },
      { status: OfferStatus.EXPIRED },
    );
  }
}

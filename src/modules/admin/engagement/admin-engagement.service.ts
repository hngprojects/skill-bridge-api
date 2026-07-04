import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentAttempt } from '../../assessments/entities/assessment-attempt.entity';
import { AssessmentType } from '../../assessments/entities/assessment-question.entity';
import {
  EngagementPageStats,
  MinorUptakeResult,
  RetakeDropoffResult,
  StatCard,
} from './dto/admin-engagement-responses.dto';

/** Days a candidate is locked out of an advanced-assessment retake after completing one. */
const RETAKE_GATE_DAYS = 14;

const MINOR_UPTAKE_EMPTY_MESSAGE = 'No minor assessment data yet.';
const RETAKE_DROPOFF_EMPTY_MESSAGE = 'Not enough retake data yet.';

/** A stat card with no period-over-period trend (Phase A). */
function statCard(value: number): StatCard {
  return { value, trend: { direction: null, change_percent: null } };
}

interface RetakeAggregates {
  retakeConversionRate: number;
  avgTimeToRetakeAfterGateClearsDays: number | null;
  /** Number of retakes keyed by attempt ordinal (2nd attempt = key 1, etc.). */
  dropoffByAttempt: Record<number, number>;
  /** Count of retake-timing samples; drives the retake-dropoff empty state. */
  retakeTimeEntriesCount: number;
}

@Injectable()
export class AdminEngagementService {
  constructor(
    @InjectRepository(AssessmentAttempt)
    private readonly attemptRepo: Repository<AssessmentAttempt>,
  ) {}

  /** Row of 4 stat cards for the Engagement page. */
  async getStats(): Promise<EngagementPageStats> {
    const aggregates = await this.computeRetakeAggregates();

    return {
      // Minor assessments have no DB entity yet — stubbed at zero (Phase A).
      minor_assessment_adoption_rate: statCard(0),
      minor_assessment_completion_rate: statCard(0),
      retake_conversion_rate: statCard(aggregates.retakeConversionRate),
      avg_time_to_retake_after_gate_clears_days: statCard(
        aggregates.avgTimeToRetakeAfterGateClearsDays ?? 0,
      ),
    };
  }

  /** Chart 1 — retake drop-off by attempt number. */
  async getRetakeDropoff(): Promise<RetakeDropoffResult> {
    const aggregates = await this.computeRetakeAggregates();

    if (aggregates.retakeTimeEntriesCount === 0) {
      return {
        buckets: [],
        empty: true,
        empty_message: RETAKE_DROPOFF_EMPTY_MESSAGE,
      };
    }

    const maxAttemptNumber = Math.max(
      3,
      ...Object.keys(aggregates.dropoffByAttempt).map(Number),
    );
    const buckets = [];
    for (let i = 1; i <= maxAttemptNumber; i++) {
      buckets.push({ attempt: i, retakes: aggregates.dropoffByAttempt[i] || 0 });
    }

    return { buckets, empty: false, empty_message: null };
  }

  /**
   * Chart 2 — minor assessment uptake by type. Stubbed until the minor
   * assessment entity exists; the `track` filter is accepted for the API
   * contract but does not affect the (always empty) result in Phase A.
   */
  getMinorUptake(_track?: string): MinorUptakeResult {
    return {
      buckets: [],
      empty: true,
      empty_message: MINOR_UPTAKE_EMPTY_MESSAGE,
    };
  }

  /**
   * Loads advanced-assessment attempts, groups them per candidate, and derives
   * the retake conversion rate, average time-to-retake after the 14-day gate
   * clears, and the retake drop-off distribution by attempt number.
   */
  private async computeRetakeAggregates(): Promise<RetakeAggregates> {
    const attempts = await this.attemptRepo.find({
      where: { assessment_type: AssessmentType.ADVANCED },
      order: { started_at: 'ASC' },
      select: ['talent_profile_id', 'started_at', 'completed_at'],
    });

    const attemptsByProfile = new Map<string, AssessmentAttempt[]>();
    for (const attempt of attempts) {
      if (!attemptsByProfile.has(attempt.talent_profile_id)) {
        attemptsByProfile.set(attempt.talent_profile_id, []);
      }
      attemptsByProfile.get(attempt.talent_profile_id)!.push(attempt);
    }

    let retakeEligibleCount = 0;
    let retakeTakenCount = 0;
    let totalRetakeTimeSeconds = 0;
    let retakeTimeEntriesCount = 0;
    const dropoffByAttempt: Record<number, number> = {};

    const now = new Date();

    for (const [, userAttempts] of attemptsByProfile) {
      if (userAttempts.length === 0) continue;

      const firstAttempt = userAttempts[0];
      if (firstAttempt.completed_at) {
        const gateClearDate = new Date(firstAttempt.completed_at);
        gateClearDate.setDate(gateClearDate.getDate() + RETAKE_GATE_DAYS);

        if (gateClearDate < now) {
          retakeEligibleCount++;
          if (userAttempts.length > 1) {
            retakeTakenCount++;
          }
        }
      }

      for (let i = 1; i < userAttempts.length; i++) {
        dropoffByAttempt[i] = (dropoffByAttempt[i] || 0) + 1;

        const prevAttempt = userAttempts[i - 1];
        const currentAttempt = userAttempts[i];
        if (prevAttempt.completed_at && currentAttempt.started_at) {
          const prevGateClear = new Date(prevAttempt.completed_at);
          prevGateClear.setDate(prevGateClear.getDate() + RETAKE_GATE_DAYS);

          const timeToRetakeMs =
            currentAttempt.started_at.getTime() - prevGateClear.getTime();
          if (timeToRetakeMs >= 0) {
            totalRetakeTimeSeconds += timeToRetakeMs / 1000;
            retakeTimeEntriesCount++;
          }
        }
      }
    }

    const retakeConversionRate =
      retakeEligibleCount > 0
        ? Math.round((retakeTakenCount / retakeEligibleCount) * 100)
        : 0;

    const avgTimeToRetakeAfterGateClearsDays =
      retakeTimeEntriesCount > 0
        ? Number(
            (
              totalRetakeTimeSeconds /
              retakeTimeEntriesCount /
              (3600 * 24)
            ).toFixed(1),
          )
        : null;

    return {
      retakeConversionRate,
      avgTimeToRetakeAfterGateClearsDays,
      dropoffByAttempt,
      retakeTimeEntriesCount,
    };
  }
}

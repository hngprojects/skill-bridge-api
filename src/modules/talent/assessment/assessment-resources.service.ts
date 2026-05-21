import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssessmentResource,
  ResourceType,
} from './entities/assessment-resource.entity';
import { AssessmentResult } from './entities/assessment-result.entity';
import { TalentProfile } from '../entities/talent-profile.entity';
import { ResourceDetail } from '../../ai/ai.types';

export interface ResourceListResponse {
  resources: AssessmentResource[];
  total: number;
  has_resources: boolean;
}

@Injectable()
export class AssessmentResourcesService {
  constructor(
    @InjectRepository(AssessmentResource)
    private readonly resourceRepo: Repository<AssessmentResource>,
    @InjectRepository(AssessmentResult)
    private readonly resultRepo: Repository<AssessmentResult>,
    @InjectRepository(TalentProfile)
    private readonly talentProfileRepo: Repository<TalentProfile>,
  ) {}

  /**
   * Persist AI-generated resources for an assessment result
   */
  async persistResources(
    resultId: string,
    resources: ResourceDetail[],
  ): Promise<void> {
    if (!resources || resources.length === 0) {
      return;
    }

    const resourceEntities = resources.map((resource, index) =>
      this.resourceRepo.create({
        result_id: resultId,
        title: resource.title,
        description: resource.description,
        type: resource.type as ResourceType,
        url: resource.url,
        is_free: resource.is_free,
        competencies: resource.competencies,
        estimated_minutes: resource.estimated_minutes,
        display_order: index,
      }),
    );

    await this.resourceRepo.save(resourceEntities);
  }

  /**
   * Get resources for a user's latest advanced assessment result
   */
  async getResourcesForUser(userId: string): Promise<ResourceListResponse> {
    // Find the user's talent profile ID
    const profile = await this.talentProfileRepo
      .createQueryBuilder('profile')
      .select('profile.id')
      .where('profile.user_id = :userId', { userId })
      .getOne();

    if (!profile) {
      throw new NotFoundException('Talent profile not found');
    }

    // Find the latest advanced assessment result for this user
    const result = await this.resultRepo
      .createQueryBuilder('result')
      .innerJoin('result.attempt', 'attempt')
      .where('attempt.talent_profile_id = :profileId', {
        profileId: profile.id,
      })
      .andWhere('attempt.assessment_type = :type', { type: 'advanced' })
      .andWhere('result.tier IS NOT NULL')
      .orderBy('result.created_at', 'DESC')
      .getOne();

    if (!result) {
      throw new NotFoundException('No completed advanced assessment found');
    }

    // Fetch resources for this result
    const resources = await this.resourceRepo.find({
      where: { result_id: result.id },
      order: { display_order: 'ASC' },
    });

    return {
      resources,
      total: resources.length,
      has_resources: resources.length > 0,
    };
  }

  /**
   * Get resources by result ID (for admin or specific retrieval)
   */
  async getResourcesByResultId(
    resultId: string,
  ): Promise<AssessmentResource[]> {
    return this.resourceRepo.find({
      where: { result_id: resultId },
      order: { display_order: 'ASC' },
    });
  }

  /**
   * Delete all resources for a result (useful for retakes/cleanup)
   */
  async deleteResourcesForResult(resultId: string): Promise<void> {
    await this.resourceRepo.delete({ result_id: resultId });
  }
}

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssessmentResourcesService } from './assessment-resources.service';
import {
  AssessmentResource,
  ResourceType,
} from './entities/assessment-resource.entity';
import { AssessmentResult } from './entities/assessment-result.entity';
import { TalentProfile } from '../entities/talent-profile.entity';
import { ResourceDetail } from '../../ai/ai.types';

describe('AssessmentResourcesService', () => {
  let service: AssessmentResourcesService;
  let resourceRepo: jest.Mocked<Repository<AssessmentResource>>;
  let resultRepo: jest.Mocked<Repository<AssessmentResult>>;
  let profileRepo: jest.Mocked<Repository<TalentProfile>>;

  const mockUserId = 'user-123';
  const mockProfileId = 'profile-456';
  const mockResultId = 'result-789';

  beforeEach(async () => {
    const mockResourceRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    const mockResultRepo = {
      createQueryBuilder: jest.fn(),
    };

    const mockProfileRepo = {
      createQueryBuilder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentResourcesService,
        {
          provide: getRepositoryToken(AssessmentResource),
          useValue: mockResourceRepo,
        },
        {
          provide: getRepositoryToken(AssessmentResult),
          useValue: mockResultRepo,
        },
        {
          provide: getRepositoryToken(TalentProfile),
          useValue: mockProfileRepo,
        },
      ],
    }).compile();

    service = module.get<AssessmentResourcesService>(
      AssessmentResourcesService,
    );
    resourceRepo = module.get(getRepositoryToken(AssessmentResource));
    resultRepo = module.get(getRepositoryToken(AssessmentResult));
    profileRepo = module.get(getRepositoryToken(TalentProfile));
  });

  describe('persistResources', () => {
    it('should save resources with correct display_order', async () => {
      const resources: ResourceDetail[] = [
        {
          title: 'React Hooks Tutorial',
          description: 'Learn React Hooks',
          type: 'video',
          url: 'https://youtube.com/watch?v=example',
          is_free: true,
          competencies: ['react', 'hooks'],
          estimated_minutes: 30,
        },
        {
          title: 'TypeScript Deep Dive',
          description: 'Master TypeScript',
          type: 'article',
          url: 'https://example.com/typescript',
          is_free: true,
          competencies: ['typescript'],
          estimated_minutes: 45,
        },
      ];

      const createdResources = resources.map((r, i) => ({
        ...r,
        id: `res-${i}`,
        result_id: mockResultId,
        display_order: i,
        type: r.type as ResourceType,
      }));

      resourceRepo.create.mockImplementation(
        (data: Partial<AssessmentResource>) => data as AssessmentResource,
      );
      resourceRepo.save.mockResolvedValue(
        createdResources as AssessmentResource[],
      );

      await service.persistResources(mockResultId, resources);

      expect(resourceRepo.create).toHaveBeenCalledTimes(2);
      expect(resourceRepo.create).toHaveBeenNthCalledWith(1, {
        result_id: mockResultId,
        title: 'React Hooks Tutorial',
        description: 'Learn React Hooks',
        type: 'video',
        url: 'https://youtube.com/watch?v=example',
        is_free: true,
        competencies: ['react', 'hooks'],
        estimated_minutes: 30,
        display_order: 0,
      });
      expect(resourceRepo.create).toHaveBeenNthCalledWith(2, {
        result_id: mockResultId,
        title: 'TypeScript Deep Dive',
        description: 'Master TypeScript',
        type: 'article',
        url: 'https://example.com/typescript',
        is_free: true,
        competencies: ['typescript'],
        estimated_minutes: 45,
        display_order: 1,
      });
      expect(resourceRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ display_order: 0 }),
          expect.objectContaining({ display_order: 1 }),
        ]),
      );
    });

    it('should handle empty resources array without error', async () => {
      await service.persistResources(mockResultId, []);

      expect(resourceRepo.create).not.toHaveBeenCalled();
      expect(resourceRepo.save).not.toHaveBeenCalled();
    });

    it('should handle null resources without error', async () => {
      await service.persistResources(mockResultId, null as never);

      expect(resourceRepo.create).not.toHaveBeenCalled();
      expect(resourceRepo.save).not.toHaveBeenCalled();
    });

    it('should handle resources with null URLs', async () => {
      const resources: ResourceDetail[] = [
        {
          title: 'General Advice',
          description: 'Practice more',
          type: 'tutorial',
          url: null,
          is_free: true,
          competencies: ['general'],
          estimated_minutes: null,
        },
      ];

      resourceRepo.create.mockImplementation(
        (data: Partial<AssessmentResource>) => data as AssessmentResource,
      );
      resourceRepo.save.mockResolvedValue([] as AssessmentResource[]);

      await service.persistResources(mockResultId, resources);

      expect(resourceRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: null,
          estimated_minutes: null,
        }),
      );
    });
  });

  describe('getResourcesForUser', () => {
    it('should return resources for user with completed assessment', async () => {
      const mockResources = [
        {
          id: 'res-1',
          result_id: mockResultId,
          title: 'Resource 1',
          description: 'Description 1',
          type: ResourceType.VIDEO,
          url: 'https://example.com/1',
          is_free: true,
          competencies: ['comp1'],
          estimated_minutes: 30,
          display_order: 0,
        },
        {
          id: 'res-2',
          result_id: mockResultId,
          title: 'Resource 2',
          description: 'Description 2',
          type: ResourceType.ARTICLE,
          url: 'https://example.com/2',
          is_free: false,
          competencies: ['comp2'],
          estimated_minutes: 45,
          display_order: 1,
        },
      ] as AssessmentResource[];

      const profileQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockProfileId }),
      };

      const resultQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockResultId }),
      };

      profileRepo.createQueryBuilder.mockReturnValue(
        profileQueryBuilder as never,
      );
      resultRepo.createQueryBuilder.mockReturnValue(
        resultQueryBuilder as never,
      );
      resourceRepo.find.mockResolvedValue(mockResources);

      const result = await service.getResourcesForUser(mockUserId);

      expect(result).toEqual({
        resources: mockResources,
        total: 2,
        has_resources: true,
      });
      expect(profileQueryBuilder.where).toHaveBeenCalledWith(
        'profile.user_id = :userId',
        { userId: mockUserId },
      );
      expect(resultQueryBuilder.andWhere).toHaveBeenCalledWith(
        'attempt.assessment_type = :type',
        { type: 'advanced' },
      );
      expect(resourceRepo.find).toHaveBeenCalledWith({
        where: { result_id: mockResultId },
        order: { display_order: 'ASC' },
      });
    });

    it('should return empty array when no resources exist', async () => {
      const profileQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockProfileId }),
      };

      const resultQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockResultId }),
      };

      profileRepo.createQueryBuilder.mockReturnValue(
        profileQueryBuilder as never,
      );
      resultRepo.createQueryBuilder.mockReturnValue(
        resultQueryBuilder as never,
      );
      resourceRepo.find.mockResolvedValue([]);

      const result = await service.getResourcesForUser(mockUserId);

      expect(result).toEqual({
        resources: [],
        total: 0,
        has_resources: false,
      });
    });

    it('should throw NotFoundException when profile not found', async () => {
      const profileQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      profileRepo.createQueryBuilder.mockReturnValue(
        profileQueryBuilder as never,
      );

      await expect(service.getResourcesForUser(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getResourcesForUser(mockUserId)).rejects.toThrow(
        'Talent profile not found',
      );
    });

    it('should throw NotFoundException when no completed assessment found', async () => {
      const profileQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockProfileId }),
      };

      const resultQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };

      profileRepo.createQueryBuilder.mockReturnValue(
        profileQueryBuilder as never,
      );
      resultRepo.createQueryBuilder.mockReturnValue(
        resultQueryBuilder as never,
      );

      await expect(service.getResourcesForUser(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getResourcesForUser(mockUserId)).rejects.toThrow(
        'No completed advanced assessment found',
      );
    });

    it('should order resources by display_order ascending', async () => {
      const profileQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockProfileId }),
      };

      const resultQueryBuilder = {
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({ id: mockResultId }),
      };

      profileRepo.createQueryBuilder.mockReturnValue(
        profileQueryBuilder as never,
      );
      resultRepo.createQueryBuilder.mockReturnValue(
        resultQueryBuilder as never,
      );
      resourceRepo.find.mockResolvedValue([]);

      await service.getResourcesForUser(mockUserId);

      expect(resourceRepo.find).toHaveBeenCalledWith({
        where: { result_id: mockResultId },
        order: { display_order: 'ASC' },
      });
    });
  });
});

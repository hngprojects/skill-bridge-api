import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AssessmentResourcesController } from './assessment-resources.controller';
import { AssessmentResourcesService } from './assessment-resources.service';
import { ResourceType } from './entities/assessment-resource.entity';

describe('AssessmentResourcesController', () => {
  let controller: AssessmentResourcesController;
  let service: jest.Mocked<AssessmentResourcesService>;

  const mockUserId = 'user-123';

  beforeEach(async () => {
    const mockService = {
      getResourcesForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssessmentResourcesController],
      providers: [
        {
          provide: AssessmentResourcesService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<AssessmentResourcesController>(
      AssessmentResourcesController,
    );
    service = module.get(AssessmentResourcesService);
  });

  describe('getResources', () => {
    it('should return resources for the authenticated user', async () => {
      const mockResponse = {
        resources: [
          {
            id: 'res-1',
            result_id: 'result-789',
            title: 'React Hooks Guide',
            description: 'Learn React Hooks fundamentals',
            type: ResourceType.VIDEO,
            url: 'https://youtube.com/watch?v=example',
            is_free: true,
            competencies: ['react', 'hooks'],
            estimated_minutes: 30,
            display_order: 0,
            created_at: new Date(),
          },
          {
            id: 'res-2',
            result_id: 'result-789',
            title: 'TypeScript Best Practices',
            description: 'Advanced TypeScript patterns',
            type: ResourceType.ARTICLE,
            url: 'https://example.com/typescript-guide',
            is_free: true,
            competencies: ['typescript', 'design-patterns'],
            estimated_minutes: 45,
            display_order: 1,
            created_at: new Date(),
          },
        ],
        total: 2,
        has_resources: true,
      };

      service.getResourcesForUser.mockResolvedValue(mockResponse);

      const result = await controller.getResources(mockUserId);

      expect(result).toEqual(mockResponse);
      expect(service.getResourcesForUser).toHaveBeenCalledWith(mockUserId);
      expect(service.getResourcesForUser).toHaveBeenCalledTimes(1);
    });

    it('should return empty resources when none exist', async () => {
      const mockResponse = {
        resources: [],
        total: 0,
        has_resources: false,
      };

      service.getResourcesForUser.mockResolvedValue(mockResponse);

      const result = await controller.getResources(mockUserId);

      expect(result).toEqual(mockResponse);
      expect(result.has_resources).toBe(false);
      expect(result.total).toBe(0);
    });

    it('should throw NotFoundException when profile not found', async () => {
      service.getResourcesForUser.mockRejectedValue(
        new NotFoundException('Talent profile not found'),
      );

      await expect(controller.getResources(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getResources(mockUserId)).rejects.toThrow(
        'Talent profile not found',
      );
    });

    it('should throw NotFoundException when no completed assessment', async () => {
      service.getResourcesForUser.mockRejectedValue(
        new NotFoundException('No completed advanced assessment found'),
      );

      await expect(controller.getResources(mockUserId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(controller.getResources(mockUserId)).rejects.toThrow(
        'No completed advanced assessment found',
      );
    });

    it('should handle resources with mixed free/paid types', async () => {
      const mockResponse = {
        resources: [
          {
            id: 'res-1',
            result_id: 'result-789',
            title: 'Free Resource',
            description: 'Free learning material',
            type: ResourceType.DOCUMENTATION,
            url: 'https://docs.example.com',
            is_free: true,
            competencies: ['basics'],
            estimated_minutes: 20,
            display_order: 0,
            created_at: new Date(),
          },
          {
            id: 'res-2',
            result_id: 'result-789',
            title: 'Paid Course',
            description: 'Premium learning content',
            type: ResourceType.COURSE,
            url: 'https://udemy.com/example',
            is_free: false,
            competencies: ['advanced'],
            estimated_minutes: 240,
            display_order: 1,
            created_at: new Date(),
          },
        ],
        total: 2,
        has_resources: true,
      };

      service.getResourcesForUser.mockResolvedValue(mockResponse);

      const result = await controller.getResources(mockUserId);

      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].is_free).toBe(true);
      expect(result.resources[1].is_free).toBe(false);
    });

    it('should handle resources with null URLs', async () => {
      const mockResponse = {
        resources: [
          {
            id: 'res-1',
            result_id: 'result-789',
            title: 'General Advice',
            description: 'Practice coding daily',
            type: ResourceType.TUTORIAL,
            url: null,
            is_free: true,
            competencies: ['general'],
            estimated_minutes: null,
            display_order: 0,
            created_at: new Date(),
          },
        ],
        total: 1,
        has_resources: true,
      };

      service.getResourcesForUser.mockResolvedValue(mockResponse);

      const result = await controller.getResources(mockUserId);

      expect(result.resources[0].url).toBeNull();
      expect(result.resources[0].estimated_minutes).toBeNull();
    });

    it('should handle all resource types', async () => {
      const mockResponse = {
        resources: [
          {
            id: 'res-1',
            result_id: 'result-789',
            title: 'Video Tutorial',
            description: 'Video content',
            type: ResourceType.VIDEO,
            url: 'https://youtube.com/example',
            is_free: true,
            competencies: ['video'],
            estimated_minutes: 30,
            display_order: 0,
            created_at: new Date(),
          },
          {
            id: 'res-2',
            result_id: 'result-789',
            title: 'Article',
            description: 'Written content',
            type: ResourceType.ARTICLE,
            url: 'https://medium.com/example',
            is_free: true,
            competencies: ['article'],
            estimated_minutes: 15,
            display_order: 1,
            created_at: new Date(),
          },
          {
            id: 'res-3',
            result_id: 'result-789',
            title: 'Course',
            description: 'Structured learning',
            type: ResourceType.COURSE,
            url: 'https://coursera.org/example',
            is_free: false,
            competencies: ['course'],
            estimated_minutes: 480,
            display_order: 2,
            created_at: new Date(),
          },
          {
            id: 'res-4',
            result_id: 'result-789',
            title: 'Documentation',
            description: 'Official docs',
            type: ResourceType.DOCUMENTATION,
            url: 'https://docs.example.com',
            is_free: true,
            competencies: ['docs'],
            estimated_minutes: 60,
            display_order: 3,
            created_at: new Date(),
          },
          {
            id: 'res-5',
            result_id: 'result-789',
            title: 'Tutorial',
            description: 'Step-by-step guide',
            type: ResourceType.TUTORIAL,
            url: 'https://tutorial.example.com',
            is_free: true,
            competencies: ['tutorial'],
            estimated_minutes: 90,
            display_order: 4,
            created_at: new Date(),
          },
          {
            id: 'res-6',
            result_id: 'result-789',
            title: 'Practice',
            description: 'Coding challenges',
            type: ResourceType.PRACTICE,
            url: 'https://leetcode.com/example',
            is_free: true,
            competencies: ['practice'],
            estimated_minutes: 120,
            display_order: 5,
            created_at: new Date(),
          },
        ],
        total: 6,
        has_resources: true,
      };

      service.getResourcesForUser.mockResolvedValue(mockResponse);

      const result = await controller.getResources(mockUserId);

      expect(result.resources).toHaveLength(6);
      const types = result.resources.map((r) => r.type);
      expect(types).toContain(ResourceType.VIDEO);
      expect(types).toContain(ResourceType.ARTICLE);
      expect(types).toContain(ResourceType.COURSE);
      expect(types).toContain(ResourceType.DOCUMENTATION);
      expect(types).toContain(ResourceType.TUTORIAL);
      expect(types).toContain(ResourceType.PRACTICE);
    });
  });
});

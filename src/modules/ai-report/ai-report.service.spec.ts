import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiReportService } from './ai-report.service';
import {
  AiReport,
  AiReportGeneratedBy,
  AiReportStatus,
  AiReportTier,
} from './entities/ai-report.entity';

const MOCK_USER_ID = 'user-uuid-123';

function makeReport(overrides: Partial<AiReport> = {}): AiReport {
  return {
    id: 'report-uuid-1',
    user_id: MOCK_USER_ID,
    status: AiReportStatus.READY,
    tier: AiReportTier.EMERGING,
    score: 62,
    generated_by: AiReportGeneratedBy.AI,
    attempt_count: 1,
    retake_eligible_at: new Date('2026-05-29T00:00:00Z'),
    payload: {
      summary: 'You showed solid skills but there is room to grow in async patterns.',
      weakAreas: [
        {
          area: 'Async State Management',
          insight: 'There is room to grow in handling async side effects.',
          resources: [{ title: 'React Query', link: 'https://tanstack.com/query' }],
        },
      ],
    },
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as AiReport;
}

describe('AiReportService', () => {
  let service: AiReportService;
  let repo: jest.Mocked<Pick<Repository<AiReport>, 'findOneBy'>>;

  beforeEach(async () => {
    repo = { findOneBy: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReportService,
        { provide: getRepositoryToken(AiReport), useValue: repo },
      ],
    }).compile();

    service = module.get<AiReportService>(AiReportService);
  });

  describe('getStatus', () => {
    it('returns pending when no report exists', async () => {
      repo.findOneBy.mockResolvedValue(null);
      const result = await service.getStatus(MOCK_USER_ID);
      expect(result.status).toBe(AiReportStatus.PENDING);
      expect(result.estimatedSecondsRemaining).toBeUndefined();
    });

    it('returns estimatedSecondsRemaining when status is generating', async () => {
      repo.findOneBy.mockResolvedValue(
        makeReport({ status: AiReportStatus.GENERATING }),
      );
      const result = await service.getStatus(MOCK_USER_ID);
      expect(result.status).toBe(AiReportStatus.GENERATING);
      expect(result.estimatedSecondsRemaining).toBe(30);
    });

    it('returns ready with no estimatedSecondsRemaining when report is ready', async () => {
      repo.findOneBy.mockResolvedValue(makeReport({ status: AiReportStatus.READY }));
      const result = await service.getStatus(MOCK_USER_ID);
      expect(result.status).toBe(AiReportStatus.READY);
      expect(result.estimatedSecondsRemaining).toBeUndefined();
    });
  });

  describe('getReport', () => {
    // Fixture 1 — Emerging report
    it('returns a well-formed Emerging report when status is ready', async () => {
      repo.findOneBy.mockResolvedValue(makeReport());
      const result = await service.getReport(MOCK_USER_ID);
      expect(result.tier).toBe(AiReportTier.EMERGING);
      expect(result.score).toBe(62);
      expect(result.generatedBy).toBe(AiReportGeneratedBy.AI);
      expect(result).toHaveProperty('weakAreas');
      expect(result).toHaveProperty('retakeEligibleAt');
    });

    // Fixture 2 — Job Ready report
    it('returns a well-formed Job Ready report', async () => {
      repo.findOneBy.mockResolvedValue(
        makeReport({
          tier: AiReportTier.JOB_READY,
          score: 84,
          retake_eligible_at: null,
          payload: {
            summary: 'You demonstrated strong command of frontend patterns.',
            strengths: [
              { area: 'Component Design', insight: 'Excellent separation of concerns.' },
            ],
          },
        }),
      );
      const result = await service.getReport(MOCK_USER_ID);
      expect(result.tier).toBe(AiReportTier.JOB_READY);
      expect(result.score).toBe(84);
      expect(result).toHaveProperty('strengths');
      expect(result).not.toHaveProperty('retakeEligibleAt');
    });

    // Fixture 3 — Generation failure fallback (template report, status = ready)
    it('returns template-generated report when generatedBy is template', async () => {
      repo.findOneBy.mockResolvedValue(
        makeReport({ generated_by: AiReportGeneratedBy.TEMPLATE }),
      );
      const result = await service.getReport(MOCK_USER_ID);
      expect(result.generatedBy).toBe(AiReportGeneratedBy.TEMPLATE);
      expect(result.tier).toBe(AiReportTier.EMERGING);
    });

    it('throws NotFoundException when report is still pending', async () => {
      repo.findOneBy.mockResolvedValue(
        makeReport({ status: AiReportStatus.PENDING }),
      );
      await expect(service.getReport(MOCK_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when report is still generating', async () => {
      repo.findOneBy.mockResolvedValue(
        makeReport({ status: AiReportStatus.GENERATING }),
      );
      await expect(service.getReport(MOCK_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws NotFoundException when no report record exists', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.getReport(MOCK_USER_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

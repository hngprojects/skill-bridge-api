import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AiReportQueueService } from './ai-report-queue.service';
import { AiReportService } from './ai-report.service';
import { TriggerReportDto } from './dto/trigger-report.dto';

@ApiTags('ai-report')
@ApiCookieAuth()
@Controller('ai-report')
@Roles(UserRole.TALENT)
export class AiReportController {
  constructor(
    private readonly aiReportService: AiReportService,
    private readonly aiReportQueueService: AiReportQueueService,
  ) {}

  @Get('status')
  @ApiOperation({
    summary: 'Poll report generation lifecycle state',
    description:
      'Returns the current status of the AI report for the authenticated user. ' +
      'Poll this endpoint until status is "ready" or "failed" before calling GET /ai-report.',
  })
  @ApiOkResponse({
    description: 'Current generation status',
    schema: {
      example: { status: 'generating', estimatedSecondsRemaining: 30 },
    },
  })
  async getStatus(@CurrentUser('sub') userId: string) {
    return this.aiReportService.getStatus(userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Fetch the generated AI report',
    description:
      'Returns the full report. Only call once /ai-report/status returns "ready" or "failed". ' +
      'On "failed", a template-generated fallback report is served.',
  })
  @ApiOkResponse({
    description: 'Full AI report payload',
    schema: {
      example: {
        tier: 'emerging',
        score: 62,
        generatedBy: 'ai',
        summary: 'You showed solid component architecture skills but struggled with async state management.',
        weakAreas: [
          {
            area: 'Async State Management',
            insight: 'There is room to grow in handling async side effects and Promise patterns.',
            resources: [{ title: 'React Query Deep Dive', link: 'https://tanstack.com/query' }],
          },
        ],
        retakeEligibleAt: '2026-05-29T00:00:00.000Z',
      },
    },
  })
  async getReport(@CurrentUser('sub') userId: string) {
    return this.aiReportService.getReport(userId);
  }

  /**
   * Internal trigger endpoint — used for demo and testing until Stage 3 grading
   * is fully implemented. When Stage 3 ships, this will be called internally
   * by the assessment service and this endpoint will be removed or admin-gated.
   */
  @Post('trigger')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: '[Internal] Trigger report generation manually',
    description:
      'Enqueues report generation for the authenticated user with the provided assessment context. ' +
      'This endpoint exists as a demo integration point until Stage 3 grading is wired up.',
  })
  async trigger(
    @CurrentUser('sub') userId: string,
    @Body() dto: TriggerReportDto,
  ) {
    await this.aiReportQueueService.enqueue({
      userId,
      score: dto.score,
      tier: dto.tier,
      track: dto.track,
      specialisation: dto.specialisation,
      validatedLevel: dto.validated_level,
    });

    return {
      message: 'Report generation queued. Poll GET /api/v1/ai-report/status to track progress.',
    };
  }
}

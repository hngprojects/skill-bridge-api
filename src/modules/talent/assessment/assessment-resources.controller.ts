import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/entities/user.entity';
import { AssessmentResourcesService } from './assessment-resources.service';
import { ResourcesListResponseDto } from './dto/resources.dto';

@ApiTags('talent-assessment')
@ApiCookieAuth()
@Controller('talent/assessment')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.TALENT)
export class AssessmentResourcesController {
  constructor(private readonly resourcesService: AssessmentResourcesService) {}

  @Get('resources')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get assessment resources for current user',
    description:
      "Returns AI-generated resources based on the user's latest advanced assessment performance. " +
      'Resources are matched to weak competencies and include free/paid labels. ' +
      'Only available for users who have completed the advanced assessment.',
  })
  @ApiOkResponse({
    description: 'Resources retrieved successfully',
    type: ResourcesListResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'No completed advanced assessment found',
  })
  async getResources(
    @CurrentUser('sub') userId: string,
  ): Promise<ResourcesListResponseDto> {
    return this.resourcesService.getResourcesForUser(userId);
  }
}

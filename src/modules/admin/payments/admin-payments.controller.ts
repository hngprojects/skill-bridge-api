import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminTiers } from '../../../common/decorators/admin-tiers.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { AdminTier, UserRole } from '../../users/entities/user.entity';
import { AdminPaymentsService } from './admin-payments.service';
import { ListSubscriptionsQueryDto } from './dto/list-subscriptions-query.dto';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';
import { RevenueChartQueryDto } from './dto/revenue-chart-query.dto';

@ApiTags('admin-payments')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@AdminTiers(AdminTier.SUPER_ADMIN)
@Controller('admin/payments')
export class AdminPaymentsController {
  constructor(private readonly paymentsService: AdminPaymentsService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Stat cards: total revenue, active subscriptions, failed payment count' })
  async getStats() {
    const data = await this.paymentsService.getStats();
    return { status: 'success', data };
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Revenue chart data split by employer/talent, with period toggle' })
  async getRevenueChart(@Query() query: RevenueChartQueryDto) {
    const data = await this.paymentsService.getRevenueChart(query);
    return { status: 'success', data };
  }

  @Get('employer-packages')
  @ApiOperation({ summary: 'List employer packages (Free + Paid tiers)' })
  async getEmployerPackages() {
    const data = await this.paymentsService.getEmployerPackages();
    return { status: 'success', data };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Subscriptions table — employer and talent, paginated' })
  async getSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    const data = await this.paymentsService.getSubscriptions(query);
    return { status: 'success', data };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Transactions table — paginated with status/date filters' })
  async getTransactions(@Query() query: ListTransactionsQueryDto) {
    const data = await this.paymentsService.getTransactions(query);
    return { status: 'success', data };
  }

  @Get('talent-subscriptions')
  @ApiOperation({ summary: 'Talent subscription summary — active/cancelled counts and price' })
  async getTalentSubscriptionSummary() {
    const data = await this.paymentsService.getTalentSubscriptionSummary();
    return { status: 'success', data };
  }
}

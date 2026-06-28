import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
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
  @ApiOkResponse({ description: 'Returns total_revenue (value + currency), active_employer_subscriptions, active_talent_subscriptions, failed_payment_count' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User is not a SUPER_ADMIN admin' })
  async getStats() {
    const data = await this.paymentsService.getStats();
    return { status: 'success', data };
  }

  @Get('revenue-chart')
  @ApiOperation({ summary: 'Revenue chart data split by employer/talent, with period toggle' })
  @ApiOkResponse({ description: 'Returns employer_revenue[] and talent_revenue[] arrays of { period, amount } objects, grouped by the selected period' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User is not a SUPER_ADMIN admin' })
  async getRevenueChart(@Query() query: RevenueChartQueryDto) {
    const data = await this.paymentsService.getRevenueChart(query);
    return { status: 'success', data };
  }

  @Get('employer-packages')
  @ApiOperation({ summary: 'List employer packages (Free + Paid tiers)' })
  @ApiOkResponse({ description: 'Returns array of packages — each with id, name, price, offer_limit, features, is_free' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User is not a SUPER_ADMIN admin' })
  async getEmployerPackages() {
    const data = await this.paymentsService.getEmployerPackages();
    return { status: 'success', data };
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'Subscriptions table — employer and talent, paginated' })
  @ApiOkResponse({ description: 'Paginated list of subscriptions — each with subscriber_name, type, package_tier, monthly_price, status, start_date, next_billing_date, days_left_in_grace' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User is not a SUPER_ADMIN admin' })
  async getSubscriptions(@Query() query: ListSubscriptionsQueryDto) {
    const data = await this.paymentsService.getSubscriptions(query);
    return { status: 'success', data };
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Transactions table — paginated with status/date filters' })
  @ApiOkResponse({ description: 'Paginated list of transactions — each with subscriber_name, type, amount, currency, date, status, linked_subscription_id' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User is not a SUPER_ADMIN admin' })
  async getTransactions(@Query() query: ListTransactionsQueryDto) {
    const data = await this.paymentsService.getTransactions(query);
    return { status: 'success', data };
  }

  @Get('talent-subscriptions')
  @ApiOperation({ summary: 'Talent subscription summary — active/cancelled counts and price' })
  @ApiOkResponse({ description: 'Returns total_active, total_cancelled counts and the monthly_price of the paid tier (null if not set)' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
  @ApiForbiddenResponse({ description: 'User is not a SUPER_ADMIN admin' })
  async getTalentSubscriptionSummary() {
    const data = await this.paymentsService.getTalentSubscriptionSummary();
    return { status: 'success', data };
  }
}

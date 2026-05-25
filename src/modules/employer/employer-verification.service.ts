import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { EmployerProfile } from './entities/employer-profile.entity';

const WEBSITE_CHECK_TIMEOUT_MS = 5_000;

@Injectable()
export class EmployerVerificationService {
  private readonly logger = new Logger(EmployerVerificationService.name);

  constructor(
    @InjectRepository(EmployerProfile)
    private readonly profileRepo: Repository<EmployerProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Evaluates all verification criteria and persists the result.
   * Returns the updated `is_verified` value.
   *
   * Criteria (all must be true):
   * 1. User email is verified (`users.is_verified`)
   * 2. Company website URL is provided AND resolvable
   * 3. LinkedIn company page URL is provided
   */
  async checkAndUpdateVerification(employerUserId: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { id: employerUserId },
    });
    if (!user) return false;

    const profile = await this.profileRepo.findOne({
      where: { user_id: employerUserId },
    });
    if (!profile) return false;

    const emailVerified = user.is_verified;
    const hasLinkedin = !!profile.linkedin_company_url;
    const websiteUrl = profile.company_website?.trim();

    let websiteResolvable = false;
    if (websiteUrl) {
      websiteResolvable = await this.isWebsiteResolvable(websiteUrl);
    }

    const isVerified = emailVerified && websiteResolvable && hasLinkedin;

    if (profile.is_verified !== isVerified) {
      await this.profileRepo.update(
        { user_id: employerUserId },
        { is_verified: isVerified },
      );
    }

    return isVerified;
  }

  /**
   * Read-only check — returns cached verification status without recomputing.
   */
  async getVerificationStatus(employerUserId: string): Promise<boolean> {
    const profile = await this.profileRepo.findOne({
      where: { user_id: employerUserId },
      select: ['is_verified'],
    });
    return profile?.is_verified ?? false;
  }

  /**
   * Checks if a URL is resolvable via HTTP HEAD (falls back to GET on 405).
   * Returns false on DNS failure, timeout, or non-2xx/3xx responses.
   */
  async isWebsiteResolvable(url: string): Promise<boolean> {
    try {
      const normalizedUrl = this.normalizeUrl(url);
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        WEBSITE_CHECK_TIMEOUT_MS,
      );

      try {
        const response = await fetch(normalizedUrl, {
          method: 'HEAD',
          signal: controller.signal,
          redirect: 'follow',
        });

        if (response.status === 405) {
          // Server doesn't allow HEAD, try GET
          const getResponse = await fetch(normalizedUrl, {
            method: 'GET',
            signal: controller.signal,
            redirect: 'follow',
          });
          return getResponse.status >= 200 && getResponse.status < 400;
        }

        return response.status >= 200 && response.status < 400;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      this.logger.debug(
        `Website resolution failed for ${url}: ${(error as Error).message}`,
      );
      return false;
    }
  }

  private normalizeUrl(url: string): string {
    if (!/^https?:\/\//i.test(url)) {
      return `https://${url}`;
    }
    return url;
  }
}

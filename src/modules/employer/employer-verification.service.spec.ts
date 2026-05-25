import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EmployerVerificationService } from './employer-verification.service';
import { EmployerProfile } from './entities/employer-profile.entity';
import { User } from '../users/entities/user.entity';

describe('EmployerVerificationService', () => {
  let service: EmployerVerificationService;

  const mockProfileRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployerVerificationService,
        {
          provide: getRepositoryToken(EmployerProfile),
          useValue: mockProfileRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<EmployerVerificationService>(
      EmployerVerificationService,
    );
    jest.clearAllMocks();
  });

  describe('checkAndUpdateVerification', () => {
    const userId = 'employer-user-1';

    const verifiedUser = {
      id: userId,
      is_verified: true,
    };

    const unverifiedUser = {
      id: userId,
      is_verified: false,
    };

    const completeProfile = {
      user_id: userId,
      company_website: 'https://acmelabs.com',
      linkedin_company_url: 'https://linkedin.com/company/acme',
      is_verified: false,
    };

    beforeEach(() => {
      // Mock isWebsiteResolvable to avoid actual HTTP calls
      jest.spyOn(service, 'isWebsiteResolvable').mockResolvedValue(true);
    });

    it('should return true and update profile when all criteria are met', async () => {
      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({ ...completeProfile });

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(true);
      expect(mockProfileRepo.update).toHaveBeenCalledWith(
        { user_id: userId },
        { is_verified: true },
      );
    });

    it('should return false when email is not verified', async () => {
      mockUserRepo.findOne.mockResolvedValue(unverifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({ ...completeProfile });

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
    });

    it('should return false when linkedin_company_url is missing', async () => {
      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({
        ...completeProfile,
        linkedin_company_url: null,
      });

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
    });

    it('should return false when company_website is missing', async () => {
      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({
        ...completeProfile,
        company_website: null,
      });

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
      expect(service.isWebsiteResolvable).not.toHaveBeenCalled();
    });

    it('should return false when website is not resolvable', async () => {
      jest.spyOn(service, 'isWebsiteResolvable').mockResolvedValue(false);

      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({ ...completeProfile });

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
    });

    it('should not call update when is_verified value has not changed', async () => {
      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({
        ...completeProfile,
        is_verified: true, // already verified
      });

      await service.checkAndUpdateVerification(userId);

      expect(mockProfileRepo.update).not.toHaveBeenCalled();
    });

    it('should revoke verification when criteria are no longer met', async () => {
      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue({
        ...completeProfile,
        linkedin_company_url: null,
        is_verified: true, // was verified, now criteria not met
      });

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
      expect(mockProfileRepo.update).toHaveBeenCalledWith(
        { user_id: userId },
        { is_verified: false },
      );
    });

    it('should return false when user not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
    });

    it('should return false when profile not found', async () => {
      mockUserRepo.findOne.mockResolvedValue(verifiedUser);
      mockProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.checkAndUpdateVerification(userId);

      expect(result).toBe(false);
    });
  });

  describe('getVerificationStatus', () => {
    it('should return cached is_verified value', async () => {
      mockProfileRepo.findOne.mockResolvedValue({ is_verified: true });

      const result = await service.getVerificationStatus('user-1');

      expect(result).toBe(true);
      expect(mockProfileRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: 'user-1' },
        select: ['is_verified'],
      });
    });

    it('should return false when profile not found', async () => {
      mockProfileRepo.findOne.mockResolvedValue(null);

      const result = await service.getVerificationStatus('user-1');

      expect(result).toBe(false);
    });
  });

  describe('isWebsiteResolvable', () => {
    beforeEach(() => {
      // Restore the real implementation for these tests
      jest.restoreAllMocks();
    });

    it('should return true for a resolvable URL', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ status: 200 });
      global.fetch = mockFetch;

      const result = await service.isWebsiteResolvable('https://example.com');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com',
        expect.objectContaining({ method: 'HEAD' }),
      );
    });

    it('should fall back to GET when HEAD returns 405', async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({ status: 405 })
        .mockResolvedValueOnce({ status: 200 });
      global.fetch = mockFetch;

      const result = await service.isWebsiteResolvable('https://example.com');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        'https://example.com',
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('should return false on network error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));

      const result = await service.isWebsiteResolvable('https://invalid.test');

      expect(result).toBe(false);
    });

    it('should return false on 5xx response', async () => {
      global.fetch = jest.fn().mockResolvedValue({ status: 500 });

      const result = await service.isWebsiteResolvable('https://down.test');

      expect(result).toBe(false);
    });

    it('should prepend https:// when protocol is missing', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ status: 200 });
      global.fetch = mockFetch;

      await service.isWebsiteResolvable('acmelabs.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://acmelabs.com',
        expect.anything(),
      );
    });
  });
});

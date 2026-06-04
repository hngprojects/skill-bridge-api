import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployerRole, EmployerRoleStatus } from './entities/employer-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class EmployerRolesService {
  private readonly logger = new Logger(EmployerRolesService.name);

  constructor(
    @InjectRepository(EmployerRole)
    private readonly roleRepo: Repository<EmployerRole>,
  ) {}

  async create(employerUserId: string, dto: CreateRoleDto): Promise<EmployerRole> {
    if (dto.salaryMin != null && dto.salaryMax != null && dto.salaryMin > dto.salaryMax) {
      throw new BadRequestException('salaryMin cannot exceed salaryMax');
    }

    const role = this.roleRepo.create({
      employer_user_id: employerUserId,
      title: dto.title.trim(),
      category: dto.category.trim(),
      description: dto.description?.trim() ?? null,
      employment_type: dto.employmentType ?? null,
      education: dto.education ?? null,
      keywords: dto.keywords ?? null,
      salary_min: dto.salaryMin ?? null,
      salary_max: dto.salaryMax ?? null,
      currency: dto.currency ?? null,
      assessment_id: dto.assessmentId ?? null,
      status: EmployerRoleStatus.ACTIVE,
    });

    const saved = await this.roleRepo.save(role);
    this.logger.log(`Role created: id=${saved.id} employer=${employerUserId} title="${saved.title}"`);
    return saved;
  }

  async findAllForEmployer(
    employerUserId: string,
    status?: EmployerRoleStatus,
  ): Promise<EmployerRole[]> {
    const where: Record<string, unknown> = { employer_user_id: employerUserId };
    if (status) {
      where.status = status;
    }
    return this.roleRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
  }

  async findOneForEmployer(employerUserId: string, roleId: string): Promise<EmployerRole> {
    const role = await this.roleRepo.findOne({
      where: { id: roleId, employer_user_id: employerUserId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(employerUserId: string, roleId: string, dto: UpdateRoleDto): Promise<EmployerRole> {
    const role = await this.findOneForEmployer(employerUserId, roleId);

    if (dto.title !== undefined) role.title = dto.title.trim();
    if (dto.category !== undefined) role.category = dto.category.trim();
    if (dto.description !== undefined) role.description = dto.description?.trim() ?? null;
    if (dto.employmentType !== undefined) role.employment_type = dto.employmentType;
    if (dto.education !== undefined) role.education = dto.education;
    if (dto.keywords !== undefined) role.keywords = dto.keywords;
    if (dto.salaryMin !== undefined) role.salary_min = dto.salaryMin;
    if (dto.salaryMax !== undefined) role.salary_max = dto.salaryMax;
    if (dto.currency !== undefined) role.currency = dto.currency;
    if (dto.assessmentId !== undefined) role.assessment_id = dto.assessmentId;

    if (role.salary_min != null && role.salary_max != null && role.salary_min > role.salary_max) {
      throw new BadRequestException('salaryMin cannot exceed salaryMax');
    }

    return this.roleRepo.save(role);
  }

  async close(employerUserId: string, roleId: string): Promise<EmployerRole> {
    const role = await this.findOneForEmployer(employerUserId, roleId);
    if (role.status === EmployerRoleStatus.CLOSED) {
      throw new BadRequestException('Role is already closed');
    }
    role.status = EmployerRoleStatus.CLOSED;
    return this.roleRepo.save(role);
  }

  async reopen(employerUserId: string, roleId: string): Promise<EmployerRole> {
    const role = await this.findOneForEmployer(employerUserId, roleId);
    if (role.status === EmployerRoleStatus.ACTIVE) {
      throw new BadRequestException('Role is already active');
    }
    role.status = EmployerRoleStatus.ACTIVE;
    return this.roleRepo.save(role);
  }

  async incrementOfferCount(roleId: string): Promise<void> {
    await this.roleRepo.increment({ id: roleId }, 'offers_sent_count', 1);
  }

  async findActiveRolesForEmployer(employerUserId: string): Promise<EmployerRole[]> {
    return this.roleRepo.find({
      where: { employer_user_id: employerUserId, status: EmployerRoleStatus.ACTIVE },
      order: { created_at: 'DESC' },
    });
  }
}

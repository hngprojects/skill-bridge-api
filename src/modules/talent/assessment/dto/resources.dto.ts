import { ApiProperty } from '@nestjs/swagger';
import { ResourceType } from '../entities/assessment-resource.entity';

export class ResourceItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: ResourceType })
  type: ResourceType;

  @ApiProperty({ nullable: true })
  url: string | null;

  @ApiProperty()
  is_free: boolean;

  @ApiProperty({ type: [String] })
  competencies: string[];

  @ApiProperty({ nullable: true })
  estimated_minutes: number | null;

  @ApiProperty()
  display_order: number;

  @ApiProperty()
  created_at: Date;
}

export class ResourcesListResponseDto {
  @ApiProperty({ type: [ResourceItemDto] })
  resources: ResourceItemDto[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  has_resources: boolean;
}

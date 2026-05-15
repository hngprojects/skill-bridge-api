import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AiReportTier } from '../entities/ai-report.entity';

export class TriggerReportDto {
  @ApiProperty({ example: 62 })
  @IsInt()
  @Min(0)
  @Max(100)
  score: number;

  @ApiProperty({ enum: AiReportTier })
  @IsEnum(AiReportTier)
  tier: AiReportTier;

  @ApiProperty({ example: 'frontend', required: false })
  @IsOptional()
  @IsString()
  track?: string;

  @ApiProperty({ example: 'React Development', required: false })
  @IsOptional()
  @IsString()
  specialisation?: string;

  @ApiProperty({ example: 'intermediate', required: false })
  @IsOptional()
  @IsString()
  validated_level?: string;
}

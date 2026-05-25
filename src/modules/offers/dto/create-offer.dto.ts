import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOfferDto {
  @ApiProperty({ format: 'uuid', description: 'Candidate user ID' })
  @IsNotEmpty()
  @IsUUID()
  candidate_user_id: string;

  @ApiProperty({ description: 'Job role title' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  role_title: string;

  @ApiProperty({ description: 'Offer message / description' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(2000)
  message: string;

  @ApiProperty({
    required: false,
    default: 14,
    description: 'Offer expiry in days (1-90)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  expires_in_days?: number = 14;
}

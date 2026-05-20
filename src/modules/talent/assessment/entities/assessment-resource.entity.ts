import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AssessmentResult } from './assessment-result.entity';

export enum ResourceType {
  VIDEO = 'video',
  ARTICLE = 'article',
  COURSE = 'course',
  DOCUMENTATION = 'documentation',
  TUTORIAL = 'tutorial',
  PRACTICE = 'practice',
}

@Entity('assessment_resources')
export class AssessmentResource {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Column({ type: 'uuid' })
  result_id: string;

  @ManyToOne(() => AssessmentResult)
  @JoinColumn({ name: 'result_id' })
  result: AssessmentResult;

  @ApiProperty({ description: 'Resource title' })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiProperty({ description: 'Resource description' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ enum: ResourceType, description: 'Type of resource' })
  @Column({ type: 'enum', enum: ResourceType })
  type: ResourceType;

  @ApiProperty({ description: 'Resource URL', required: false, nullable: true })
  @Column({ type: 'varchar', length: 1000, nullable: true })
  url: string | null;

  @ApiProperty({ description: 'Whether the resource is free' })
  @Column({ type: 'boolean', default: true })
  is_free: boolean;

  @ApiProperty({
    description: 'Competencies this resource addresses',
    type: [String],
  })
  @Column({ type: 'varchar', array: true, default: [] })
  competencies: string[];

  @ApiProperty({
    description: 'Estimated time to complete (in minutes)',
    required: false,
    nullable: true,
  })
  @Column({ type: 'integer', nullable: true })
  estimated_minutes: number | null;

  @ApiProperty({
    description: 'Additional metadata for the resource',
    required: false,
    nullable: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @ApiProperty({ description: 'Display order' })
  @Column({ type: 'integer', default: 0 })
  display_order: number;

  @ApiProperty()
  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;
}

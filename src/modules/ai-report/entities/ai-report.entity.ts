import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AiReportStatus {
  PENDING = 'pending',
  GENERATING = 'generating',
  READY = 'ready',
  FAILED = 'failed',
}

export enum AiReportTier {
  EMERGING = 'emerging',
  JOB_READY = 'job_ready',
}

export enum AiReportGeneratedBy {
  AI = 'ai',
  TEMPLATE = 'template',
}

export interface WeakArea {
  area: string;
  insight: string;
  resources: Array<{ title: string; link: string }>;
}

export interface Strength {
  area: string;
  insight: string;
}

export interface AiReportPayload {
  summary: string;
  weakAreas?: WeakArea[];
  strengths?: Strength[];
}

@Entity('ai_reports')
export class AiReport {
  @ApiProperty({ format: 'uuid' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({ format: 'uuid' })
  @Index({ unique: true })
  @Column({ type: 'uuid' })
  user_id: string;

  @ApiProperty({ enum: AiReportStatus })
  @Column({ type: 'enum', enum: AiReportStatus, default: AiReportStatus.PENDING })
  status: AiReportStatus;

  @ApiProperty({ enum: AiReportTier, nullable: true })
  @Column({ type: 'enum', enum: AiReportTier, nullable: true })
  tier: AiReportTier | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'integer', nullable: true })
  score: number | null;

  @ApiProperty({ enum: AiReportGeneratedBy, nullable: true })
  @Column({ type: 'enum', enum: AiReportGeneratedBy, nullable: true })
  generated_by: AiReportGeneratedBy | null;

  @ApiProperty({ nullable: true })
  @Column({ type: 'jsonb', nullable: true })
  payload: AiReportPayload | null;

  @ApiProperty({ default: 0 })
  @Column({ type: 'integer', default: 0 })
  attempt_count: number;

  @ApiProperty({ nullable: true })
  @Column({ type: 'timestamp with time zone', nullable: true })
  retake_eligible_at: Date | null;

  @ApiProperty()
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  created_at: Date;

  @ApiProperty()
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updated_at: Date;
}

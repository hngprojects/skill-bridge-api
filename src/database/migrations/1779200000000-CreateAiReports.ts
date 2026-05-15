import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiReports1779200000000 implements MigrationInterface {
  name = 'CreateAiReports1779200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."ai_reports_status_enum" AS ENUM (
        'pending',
        'generating',
        'ready',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."ai_reports_tier_enum" AS ENUM (
        'emerging',
        'job_ready'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "public"."ai_reports_generated_by_enum" AS ENUM (
        'ai',
        'template'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "ai_reports" (
        "id"                  uuid                NOT NULL DEFAULT uuid_generate_v4(),
        "user_id"             uuid                NOT NULL,
        "status"              "public"."ai_reports_status_enum" NOT NULL DEFAULT 'pending',
        "tier"                "public"."ai_reports_tier_enum",
        "score"               integer,
        "generated_by"        "public"."ai_reports_generated_by_enum",
        "payload"             jsonb,
        "attempt_count"       integer             NOT NULL DEFAULT 0,
        "retake_eligible_at"  TIMESTAMP WITH TIME ZONE,
        "created_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at"          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_reports" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_ai_reports_user_id" ON "ai_reports" ("user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."UQ_ai_reports_user_id"`);
    await queryRunner.query(`DROP TABLE "ai_reports"`);
    await queryRunner.query(`DROP TYPE "public"."ai_reports_generated_by_enum"`);
    await queryRunner.query(`DROP TYPE "public"."ai_reports_tier_enum"`);
    await queryRunner.query(`DROP TYPE "public"."ai_reports_status_enum"`);
  }
}

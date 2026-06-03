import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePersonalAssessmentQuestions1779920000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "personal_assessment_questions" (
        "id" character varying(50) NOT NULL,
        "section" character varying(100) NOT NULL,
        "track" character varying(100) NOT NULL DEFAULT 'all',
        "question" text NOT NULL,
        "field_name" character varying(100) NOT NULL,
        "format" character varying(30) NOT NULL,
        "required" boolean NOT NULL DEFAULT true,
        "options" jsonb,
        "skip_storage" boolean NOT NULL DEFAULT false,
        "profile_field" character varying(50),
        "min_length" integer,
        "max_length" integer,
        "other_text_key" character varying(100),
        "follow_up_key" character varying(100),
        "follow_up_when" character varying(100),
        "display_order" integer NOT NULL DEFAULT 0,
        "is_live" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_personal_assessment_questions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_personal_assessment_questions_field_name_track" UNIQUE ("field_name", "track"),
        CONSTRAINT "CHK_personal_assessment_questions_section" CHECK (
          "section" IN (
            'professional_background',
            'skills_and_expertise',
            'leadership_and_responsibility',
            'international_and_remote_experience',
            'work_style'
          )
        ),
        CONSTRAINT "CHK_personal_assessment_questions_format" CHECK (
          "format" IN (
            'single_select',
            'multi_select',
            'text_required',
            'text_optional'
          )
        )
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_personal_assessment_questions_section"
      ON "personal_assessment_questions" ("section", "display_order")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_personal_assessment_questions_track"
      ON "personal_assessment_questions" ("track")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "personal_assessment_questions"
      DROP CONSTRAINT IF EXISTS "CHK_personal_assessment_questions_format"
    `);
    await queryRunner.query(`
      ALTER TABLE "personal_assessment_questions"
      DROP CONSTRAINT IF EXISTS "CHK_personal_assessment_questions_section"
    `);
    await queryRunner.query(
      `DROP TABLE IF EXISTS "personal_assessment_questions"`,
    );
  }
}

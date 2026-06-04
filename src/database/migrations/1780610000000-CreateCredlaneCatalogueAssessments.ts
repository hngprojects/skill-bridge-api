import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCredlaneCatalogueAssessments1780610000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "credlane_catalogue_assessments" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(255) NOT NULL,
        "description" text,
        "estimated_completion_time" character varying(100) NOT NULL,
        "role_track" character varying(100) NOT NULL,
        "experience_level" "employer_assessment_experience_level_enum" NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        CONSTRAINT "PK_credlane_catalogue_assessments" PRIMARY KEY ("id")
      );

      CREATE INDEX "IDX_credlane_catalogue_assessments_active"
        ON "credlane_catalogue_assessments" ("is_active");

      CREATE INDEX "IDX_credlane_catalogue_assessments_track_level"
        ON "credlane_catalogue_assessments" ("role_track", "experience_level");
    `);

    await queryRunner.query(`
      ALTER TABLE "employer_assessments"
        ADD COLUMN "credlane_assessment_id" uuid,
        ADD CONSTRAINT "FK_employer_assessments_credlane_catalogue"
          FOREIGN KEY ("credlane_assessment_id")
          REFERENCES "credlane_catalogue_assessments"("id")
          ON DELETE SET NULL;
    `);

    // Seed initial catalogue entries
    await queryRunner.query(`
      INSERT INTO "credlane_catalogue_assessments"
        ("title", "description", "estimated_completion_time", "role_track", "experience_level")
      VALUES
        ('Frontend Development – Junior', 'Core HTML, CSS, and introductory JavaScript concepts for junior front-end developers.', '20 minutes', 'Frontend', 'junior'),
        ('Frontend Development – Mid-Level', 'Intermediate JavaScript, React patterns, and browser APIs for mid-level front-end developers.', '30 minutes', 'Frontend', 'mid'),
        ('Frontend Development – Senior', 'Advanced JavaScript, performance optimisation, and architectural patterns for senior front-end developers.', '40 minutes', 'Frontend', 'senior'),
        ('Backend Development – Junior', 'REST API fundamentals, basic SQL, and server-side concepts for junior back-end developers.', '20 minutes', 'Backend', 'junior'),
        ('Backend Development – Mid-Level', 'Database design, authentication flows, and Node.js/server patterns for mid-level back-end developers.', '30 minutes', 'Backend', 'mid'),
        ('Backend Development – Senior', 'System design, microservices, scalability, and advanced database topics for senior back-end developers.', '40 minutes', 'Backend', 'senior'),
        ('Full Stack Development – Junior', 'Foundational front-end and back-end concepts for junior full-stack developers.', '30 minutes', 'Full Stack', 'junior'),
        ('Full Stack Development – Mid-Level', 'React, REST APIs, and database integration for mid-level full-stack developers.', '40 minutes', 'Full Stack', 'mid'),
        ('Full Stack Development – Senior', 'End-to-end architecture, DevOps basics, and advanced full-stack patterns for senior developers.', '60 minutes', 'Full Stack', 'senior');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employer_assessments"
        DROP CONSTRAINT IF EXISTS "FK_employer_assessments_credlane_catalogue",
        DROP COLUMN IF EXISTS "credlane_assessment_id";
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_credlane_catalogue_assessments_track_level";
      DROP INDEX IF EXISTS "IDX_credlane_catalogue_assessments_active";
      DROP TABLE IF EXISTS "credlane_catalogue_assessments";
    `);
  }
}

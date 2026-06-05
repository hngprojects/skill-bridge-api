import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Replaces the 2-column active-offer uniqueness index
 * (employer_user_id, candidate_user_id) with a 3-column index that includes
 * role_id so the same employer can send multiple offers to the same candidate
 * for different roles.
 *
 * PostgreSQL treats NULL as distinct in unique indexes, so legacy offers
 * without a role_id (role_id IS NULL) are automatically grandfathered — they
 * will not collide with each other or with role-scoped offers.
 *
 * The WHERE clause is also expanded to cover the full set of "active" statuses
 * that were already defined in the entity @Index decorator.
 */
export class UpdateOfferUniqueConstraint1780590000000 implements MigrationInterface {
  name = 'UpdateOfferUniqueConstraint1780590000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_offers_active_employer_candidate"`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_offers_active_employer_candidate"
      ON "offers" ("employer_user_id", "candidate_user_id", "role_id")
      WHERE "status" IN ('pending', 'assessment_unlocked', 'assessment_completed', 'passed', 'accepted')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_offers_active_employer_candidate"`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_offers_active_employer_candidate"
      ON "offers" ("employer_user_id", "candidate_user_id")
      WHERE "status" IN ('pending', 'accepted')
    `);
  }
}

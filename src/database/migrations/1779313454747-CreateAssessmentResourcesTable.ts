import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableForeignKey,
} from 'typeorm';

export class CreateAssessmentResourcesTable1779313454747 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create resource_type enum
    await queryRunner.query(`
      CREATE TYPE "resource_type_enum" AS ENUM (
        'video',
        'article',
        'course',
        'documentation',
        'tutorial',
        'practice'
      )
    `);

    // Create assessment_resources table
    await queryRunner.createTable(
      new Table({
        name: 'assessment_resources',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'gen_random_uuid()',
          },
          {
            name: 'result_id',
            type: 'uuid',
          },
          {
            name: 'title',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'text',
          },
          {
            name: 'type',
            type: 'resource_type_enum',
          },
          {
            name: 'url',
            type: 'varchar',
            length: '1000',
            isNullable: true,
          },
          {
            name: 'is_free',
            type: 'boolean',
            default: true,
          },
          {
            name: 'competencies',
            type: 'varchar',
            isArray: true,
            default: 'ARRAY[]::varchar[]',
          },
          {
            name: 'estimated_minutes',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'display_order',
            type: 'integer',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamp with time zone',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Add foreign key to assessment_results
    await queryRunner.createForeignKey(
      'assessment_resources',
      new TableForeignKey({
        name: 'FK_assessment_resources_result',
        columnNames: ['result_id'],
        referencedTableName: 'assessment_results',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    // Create index on result_id for faster lookups
    await queryRunner.query(`
      CREATE INDEX "IDX_assessment_resources_result_id" 
      ON "assessment_resources" ("result_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_assessment_resources_result_id"`,
    );

    // Drop foreign key
    await queryRunner.query(
      `ALTER TABLE "assessment_resources" DROP CONSTRAINT IF EXISTS "FK_assessment_resources_result"`,
    );

    // Drop table
    await queryRunner.dropTable('assessment_resources', true);

    // Drop enum
    await queryRunner.query(`DROP TYPE IF EXISTS "resource_type_enum"`);
  }
}

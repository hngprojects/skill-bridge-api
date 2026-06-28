import { DataSource } from 'typeorm';
import { EmployerPackage } from '../../modules/payments/entities/employer-package.entity';
import { Seeder } from './seeder.interface';

export const employerPackageSeeder: Seeder = {
  name: 'EmployerPackageSeeder',
  async run(dataSource: DataSource) {
    const repo = dataSource.getRepository(EmployerPackage);

    const existing = await repo.count();
    if (existing > 0) {
      console.log('[EmployerPackageSeeder] packages already exist - skipping');
      return;
    }

    await repo.save([
      repo.create({
        name: 'Free',
        price: 0,
        offer_limit: 2,
        features: null,
        is_free: true,
      }),
      repo.create({
        name: 'Paid',
        price: 0,
        offer_limit: null,
        features: null,
        is_free: false,
      }),
    ]);

    console.log('[EmployerPackageSeeder] seeded Free + Paid placeholder packages');
  },
};

import { seedTestDatabase, withTestClient } from "./test-database";

export async function restoreSeedData(): Promise<void> {
  await withTestClient(async (client) => {
    await client.query(`
      TRUNCATE TABLE
        audit_logs,
        payment_confirmations,
        application_status_histories,
        application_relatives,
        applications,
        registration_link_status_histories,
        registration_links,
        majors,
        admission_periods,
        users
      RESTART IDENTITY CASCADE
    `);
  });
  await seedTestDatabase();
}

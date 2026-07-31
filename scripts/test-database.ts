import {
  createTestDatabase,
  prepareTestDatabase,
  requireSafeTestDatabase,
  resetTestDatabase,
  seedTestDatabase,
} from "../tests/helpers/test-database";

const command = process.argv[2];
requireSafeTestDatabase();

switch (command) {
  case "create":
    await createTestDatabase();
    break;
  case "reset":
    await resetTestDatabase();
    break;
  case "seed":
    await seedTestDatabase();
    break;
  case "prepare":
    await prepareTestDatabase();
    break;
  default:
    throw new Error("Expected one of: create, reset, seed, prepare.");
}

console.log(`Test database command "${command}" completed.`);

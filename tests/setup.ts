// Unit/integration tests run against the dedicated test database.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/learncrew_test";

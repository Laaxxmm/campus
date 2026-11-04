export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseEnv } = await import("./env");
    try {
      parseEnv();
    } catch (e) {
      // Fail fast: Next would otherwise keep serving 500s with a broken config.
      console.error(String(e instanceof Error ? e.message : e));
      process.exit(1);
    }
  }
}

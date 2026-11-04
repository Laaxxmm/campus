export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { parseEnv } = await import("./env");
    parseEnv(); // throws → server fails to boot on bad env
  }
}

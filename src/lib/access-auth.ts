export const ACCESS_COOKIE_NAME = "unahouse_auth";
export const ACCESS_KEY_ENV_NAME = "UNAHOUSE_ACCESS_KEY_BASE64";

export function getAccessKey(): string {
  return process.env[ACCESS_KEY_ENV_NAME]?.trim() ?? "";
}

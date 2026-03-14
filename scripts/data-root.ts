const DEFAULT_DATA_ROOT =
  "/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/raw";

export function resolveDataRoot(argvValue?: string): string {
  return argvValue || process.env.UNAHOUSE_IMPORT_ROOT || DEFAULT_DATA_ROOT;
}

export function getDefaultDataRoot(): string {
  return DEFAULT_DATA_ROOT;
}

export type DatabaseResult<T> = {
  data: T | null;
  error: { code?: string; message?: string } | null;
};

export async function insertOrRecoverUnique<T>(args: {
  insert: () => Promise<DatabaseResult<T>>;
  recover: () => Promise<DatabaseResult<T>>;
  validateRecovered?: (value: T) => boolean;
  missingError: string;
}): Promise<{ value: T; duplicate: boolean }> {
  const inserted = await args.insert();
  if (!inserted.error && inserted.data) {
    return { value: inserted.data, duplicate: false };
  }
  if (inserted.error?.code !== "23505") {
    throw inserted.error ?? new Error(args.missingError);
  }

  const recovered = await args.recover();
  if (
    recovered.error ||
    !recovered.data ||
    (args.validateRecovered && !args.validateRecovered(recovered.data))
  ) {
    throw recovered.error ?? inserted.error;
  }
  return { value: recovered.data, duplicate: true };
}

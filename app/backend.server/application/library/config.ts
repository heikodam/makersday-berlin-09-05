import { z } from "zod";
import { readFromEnv } from "@backend-platform/shared/env/env-utils";

const TEN_KB = 10 * 1024;
const TWENTY_FIVE_MB = 25 * 1024 * 1024;

export class LibraryConfig {
  constructor(
    readonly defaultLibraryName: string,
    readonly minByteSize: number,
    readonly maxByteSize: number,
  ) {}

  static fromEnv(): LibraryConfig {
    const env = readFromEnv(
      z.object({
        LIBRARY_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().optional(),
      }),
    );
    return new LibraryConfig("My Library", TEN_KB, env.LIBRARY_MAX_UPLOAD_BYTES ?? TWENTY_FIVE_MB);
  }
}

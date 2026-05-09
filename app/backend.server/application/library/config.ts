import { z } from "zod";
import { readFromEnv } from "@backend-platform/shared/env/env-utils";

export class LibraryConfig {
  constructor(readonly maxUploadBytes: number) {}

  static fromEnv(): LibraryConfig {
    const env = readFromEnv(
      z.object({
        LIBRARY_MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(26_214_400),
      }),
    );
    return new LibraryConfig(env.LIBRARY_MAX_UPLOAD_BYTES);
  }
}

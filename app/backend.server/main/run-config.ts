import { z } from "zod";
import { readFromEnv } from "@backend-platform/shared/env/env-utils";
import { MongoClientConfig } from "@backend-platform/infrastructure/mongo/config";
import { AuthConfig } from "@backend-application/authentication/config";
import { LibraryConfig } from "@backend-application/library/config";

const environmentValues = ["development", "staging", "production"] as const;
const environmentSchema = z.enum(environmentValues);
export type Environment = z.infer<typeof environmentSchema>;

const APP_VERSION = "0.1.0";

function defaultBaseUrlFor(environment: Environment): string {
  if (environment === "production") return "https://scholastic.ai";
  if (environment === "staging") return "https://staging.scholastic.ai";
  return "http://localhost:5173";
}

export class AppConfig {
  constructor(
    readonly environment: Environment,
    readonly appVersion: string,
    readonly baseUrl: string,
    readonly mongo: MongoClientConfig,
    readonly auth: AuthConfig,
    readonly library: LibraryConfig,
  ) {}

  isLocal(): boolean {
    return this.environment !== "production" && this.environment !== "staging";
  }

  isProduction(): boolean {
    return this.environment === "production";
  }

  static fromEnv(): AppConfig {
    const env = readFromEnv(
      z.object({
        DEPLOYED_ENV: environmentSchema.default("development"),
        BASE_URL: z.string().url().optional(),
      }),
    );

    const baseUrl = env.BASE_URL ?? defaultBaseUrlFor(env.DEPLOYED_ENV);

    if (env.DEPLOYED_ENV === "production" && baseUrl.startsWith("http://")) {
      console.warn(
        "[AppConfig] DEPLOYED_ENV=production but BASE_URL is http://; the Secure cookie flag will prevent sign-in. Use https:// for production deployments.",
      );
    }

    return new AppConfig(
      env.DEPLOYED_ENV,
      APP_VERSION,
      baseUrl,
      MongoClientConfig.fromEnv(),
      AuthConfig.fromEnv(env.DEPLOYED_ENV),
      LibraryConfig.fromEnv(),
    );
  }
}

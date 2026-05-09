import { MongoDBClient } from "@backend-platform/infrastructure/mongo/client";
import { UserMongoRepo } from "@backend-infrastructure/repositories/user/user-mongo.repo";
import { LibraryMongoRepo } from "@backend-infrastructure/repositories/library/library-mongo.repo";
import { PdfParseAdapter } from "@backend-infrastructure/gateways/pdf-parse/pdf-parse.adapter";
import { LoginService } from "@backend-application/authentication/login.service";
import { LibraryService } from "@backend-application/library/library.service";
import type { AppConfig } from "./run-config";

export interface ApplicationInstances {
  mongoClient: MongoDBClient;
  userRepository: UserMongoRepo;
  loginService: LoginService;
  libraryService: LibraryService;
}

export function buildApplicationInstances(config: AppConfig): ApplicationInstances {
  const mongoClient = new MongoDBClient(config.mongo.connectionString, config.mongo.database);
  const userRepository = new UserMongoRepo(mongoClient);

  const loginService = new LoginService(config.auth, userRepository, () => new Date());

  const libraryRepo = new LibraryMongoRepo(mongoClient);
  const pdfParser = new PdfParseAdapter();
  const libraryService = new LibraryService(config.library, libraryRepo, pdfParser);

  return { mongoClient, userRepository, loginService, libraryService };
}

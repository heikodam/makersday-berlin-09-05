import { MongoDBClient } from "@backend-platform/infrastructure/mongo/client";
import { UserMongoRepo } from "@backend-infrastructure/repositories/user/user-mongo.repo";
import { LoginService } from "@backend-application/authentication/login.service";
import { LibraryService } from "@backend-application/library/library.service";
import { LibraryMongoRepo } from "@backend-infrastructure/repositories/library/library-mongo.repo";
import { GridFsPdfStorageAdapter } from "@backend-infrastructure/gateways/library/gridfs-pdf-storage.adapter";
import { PdfParseParserAdapter } from "@backend-infrastructure/gateways/library/pdf-parse.adapter";
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
  const pdfStorage = new GridFsPdfStorageAdapter();
  const pdfParser = new PdfParseParserAdapter();
  const libraryService = new LibraryService(libraryRepo, pdfStorage, pdfParser, config.library, () => new Date());

  return { mongoClient, userRepository, loginService, libraryService };
}

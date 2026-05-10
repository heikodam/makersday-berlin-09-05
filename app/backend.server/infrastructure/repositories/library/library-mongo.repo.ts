import { getModelForClass, type DocumentType } from "@typegoose/typegoose";
import type { Model } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { Repository } from "@backend-platform/infrastructure/mongo/repository";
import type { MongoDBClient } from "@backend-platform/infrastructure/mongo/client";
import { librarySchema, type Library } from "@backend-domain/library/library";
import { artifactSchema, type Artifact, type UploadStatus } from "@backend-domain/library/artifact";
import type { LibraryRepo } from "@backend-domain/library/library.repo";
import { LibraryMongoModel, type LibraryMongoDocument } from "./library-mongo.model";
import { ArtifactMongoModel, type ArtifactMongoDocument } from "./artifact-mongo.model";

export class LibraryMongoRepo extends Repository<LibraryMongoDocument, Library> implements LibraryRepo {
  private readonly artifactModel: Model<ArtifactMongoDocument>;

  constructor(mongoClient: MongoDBClient) {
    super({ entityClass: LibraryMongoModel, mongoClient, modelName: "libraries", zodSchema: librarySchema });
    this.artifactModel = getModelForClass(ArtifactMongoModel, { options: { customName: "artifacts" } }) as unknown as Model<ArtifactMongoDocument>;
  }

  private async _ensureIndexes(): Promise<void> {
    await this.mongoClient.ensureConnection();
    await this.model.collection.createIndex({ userId: 1 });
    await this.model.collection.createIndex({ userId: 1, nameLower: 1 }, { unique: true });
    await this.artifactModel.collection.createIndex({ libraryId: 1 });
    await this.artifactModel.collection.createIndex({ libraryId: 1, "sourceFile.sha256Hash": 1 }, { unique: true });
    await this.artifactModel.collection.createIndex({ libraryId: 1, uploadStatus: 1, kind: 1 });
  }

  async getDefaultForUser(userId: string): Promise<Library | null> {
    const doc = await this._findOne({ userId, isActive: true } as never);
    return doc ? this._toLibrary(doc) : null;
  }

  async ensureDefaultForUser(userId: string, defaultName: string): Promise<Library> {
    const existing = await this.getDefaultForUser(userId);
    if (existing) return existing;

    await this._ensureIndexes();
    const now = new Date();
    const lib: Library = {
      id: uuidv4(),
      userId,
      name: defaultName,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    const docData = { ...lib, nameLower: defaultName.trim().toLowerCase() };
    await this.mongoClient.ensureConnection();
    const doc = new this.model(docData);
    await doc.save();
    return this._toLibrary(doc);
  }

  async addArtifactToLibrary(userId: string, libraryId: string, artifact: Artifact): Promise<Artifact> {
    await this._verifyLibraryOwnership(userId, libraryId);
    await this.mongoClient.ensureConnection();
    await this._ensureIndexes();
    const validated = artifactSchema.parse(artifact);
    const doc = new this.artifactModel(validated);
    await doc.save();
    return this._toArtifact(doc);
  }

  async getArtifactById(userId: string, libraryId: string, artifactId: string): Promise<Artifact | null> {
    await this._verifyLibraryOwnership(userId, libraryId);
    await this.mongoClient.ensureConnection();
    const doc = await this.artifactModel.findOne({ id: artifactId, libraryId }).exec();
    return doc ? this._toArtifact(doc) : null;
  }

  async listArtifactsForLibrary(userId: string, libraryId: string): Promise<Artifact[]> {
    await this._verifyLibraryOwnership(userId, libraryId);
    await this.mongoClient.ensureConnection();
    const docs = await this.artifactModel
      .find({ libraryId, uploadStatus: { $nin: ["removed"] } })
      .sort({ uploadedAt: -1 })
      .exec();
    return docs.map((d) => this._toArtifact(d));
  }

  async findArtifactByHash(userId: string, libraryId: string, sha256Hash: string): Promise<Artifact | null> {
    await this._verifyLibraryOwnership(userId, libraryId);
    await this.mongoClient.ensureConnection();
    const doc = await this.artifactModel.findOne({ libraryId, "sourceFile.sha256Hash": sha256Hash }).exec();
    return doc ? this._toArtifact(doc) : null;
  }

  async updateArtifactStatus(
    userId: string,
    libraryId: string,
    artifactId: string,
    nextStatus: UploadStatus,
    extra?: { pageCount?: number; processedAt?: Date },
  ): Promise<Artifact> {
    await this._verifyLibraryOwnership(userId, libraryId);
    await this.mongoClient.ensureConnection();
    const update: Record<string, unknown> = { uploadStatus: nextStatus, updatedAt: new Date() };
    if (extra?.pageCount != null) update.pageCount = extra.pageCount;
    if (extra?.processedAt != null) update.processedAt = extra.processedAt;
    const doc = await this.artifactModel
      .findOneAndUpdate({ id: artifactId, libraryId }, { $set: update }, { returnDocument: "after" })
      .exec();
    if (!doc) throw new Error(`Artifact ${artifactId} not found`);
    return this._toArtifact(doc);
  }

  async removeArtifact(userId: string, libraryId: string, artifactId: string): Promise<void> {
    await this.updateArtifactStatus(userId, libraryId, artifactId, "removed");
  }

  private async _verifyLibraryOwnership(userId: string, libraryId: string): Promise<void> {
    const lib = await this._findOne({ id: libraryId, userId } as never);
    if (!lib) throw new Error(`Library ${libraryId} not found for user ${userId}`);
  }

  private _toLibrary(doc: LibraryMongoDocument): Library {
    const { _id: _ignored, nameLower: _nl, ...rest } = doc.toObject({ versionKey: false }) as Record<string, unknown> & { _id: unknown; nameLower: unknown };
    return librarySchema.parse(rest);
  }

  private _toArtifact(doc: ArtifactMongoDocument): Artifact {
    const { _id: _ignored, ...rest } = doc.toObject({ versionKey: false }) as Record<string, unknown> & { _id: unknown };
    return artifactSchema.parse(rest);
  }
}

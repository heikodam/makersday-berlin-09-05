import mongoose from "mongoose";
import { GridFSBucket, ObjectId } from "mongodb";
import { getModelForClass, type ReturnModelType } from "@typegoose/typegoose";
import { Repository } from "@backend-platform/infrastructure/mongo/repository";
import type { MongoDBClient } from "@backend-platform/infrastructure/mongo/client";
import { librarySchema, type Library } from "@backend-domain/library/library";
import { artifactSchema, type Artifact, type ArtifactStatus } from "@backend-domain/library/artifact";
import type { LibraryRepo } from "@backend-domain/library/library.repo";
import { LibraryMongoModel, type LibraryMongoDocument } from "./library-mongo.model";
import { ArtifactMongoModel, type ArtifactMongoDocument } from "./artifact-mongo.model";

export class LibraryMongoRepo
  extends Repository<LibraryMongoDocument, Library>
  implements LibraryRepo
{
  private readonly artifactModel: ReturnModelType<typeof ArtifactMongoModel>;
  private gridFSBucket: GridFSBucket | null = null;

  constructor(mongoClient: MongoDBClient) {
    super({
      entityClass: LibraryMongoModel,
      mongoClient,
      modelName: "libraries",
      zodSchema: librarySchema,
    });
    this.artifactModel = getModelForClass(ArtifactMongoModel, {
      options: { customName: "artifacts" },
    }) as ReturnModelType<typeof ArtifactMongoModel>;
  }

  private getGridFSBucket(): GridFSBucket {
    if (!this.gridFSBucket) {
      this.gridFSBucket = new GridFSBucket(mongoose.connection.db!, { bucketName: "pdfs" });
    }
    return this.gridFSBucket;
  }

  private documentToArtifact(doc: ArtifactMongoDocument): Artifact {
    const { _id: _ignored, ...data } = doc.toObject({ versionKey: false }) as Record<string, unknown> & {
      _id: unknown;
    };
    return artifactSchema.parse(data);
  }

  async findOrCreateDefaultLibrary(userId: string): Promise<Library> {
    await this.mongoClient.ensureConnection();
    const now = new Date();
    const doc = await this.model.findOneAndUpdate(
      { userId, nameLower: "my library" },
      {
        $set: { userId, name: "My Library", nameLower: "my library", isActive: true, updatedAt: now },
        $setOnInsert: { id: crypto.randomUUID(), createdAt: now },
      },
      { upsert: true, new: true },
    );
    return this.documentToEntity(doc!);
  }

  async addArtifactToLibrary(userId: string, libraryId: string, artifact: Artifact): Promise<Artifact> {
    await this.mongoClient.ensureConnection();
    await this._verifyLibraryBelongsToUser(userId, libraryId);
    const doc = await this.artifactModel.create(artifact);
    return this.documentToArtifact(doc);
  }

  async getArtifactById(userId: string, libraryId: string, artifactId: string): Promise<Artifact | null> {
    await this.mongoClient.ensureConnection();
    await this._verifyLibraryBelongsToUser(userId, libraryId);
    const doc = await this.artifactModel.findOne({ libraryId, id: artifactId });
    return doc ? this.documentToArtifact(doc) : null;
  }

  async listArtifactsForLibrary(userId: string, libraryId: string): Promise<Artifact[]> {
    await this.mongoClient.ensureConnection();
    await this._verifyLibraryBelongsToUser(userId, libraryId);
    const docs = await this.artifactModel
      .find({ libraryId, uploadStatus: { $nin: ["removed", "failed"] } })
      .sort({ createdAt: -1 });
    return docs.map((doc) => this.documentToArtifact(doc));
  }

  async findArtifactByHash(userId: string, libraryId: string, sha256Hash: string): Promise<Artifact | null> {
    await this.mongoClient.ensureConnection();
    await this._verifyLibraryBelongsToUser(userId, libraryId);
    const doc = await this.artifactModel.findOne({ libraryId, "sourceFile.sha256Hash": sha256Hash });
    return doc ? this.documentToArtifact(doc) : null;
  }

  async updateArtifactStatus(
    userId: string,
    libraryId: string,
    artifactId: string,
    status: ArtifactStatus,
    opts?: { pageCount?: number; processedAt?: Date },
  ): Promise<Artifact> {
    await this.mongoClient.ensureConnection();
    await this._verifyLibraryBelongsToUser(userId, libraryId);
    const update: Record<string, unknown> = { uploadStatus: status, updatedAt: new Date() };
    if (opts?.pageCount !== undefined) update.pageCount = opts.pageCount;
    if (opts?.processedAt !== undefined) update.processedAt = opts.processedAt;
    const doc = await this.artifactModel.findOneAndUpdate(
      { libraryId, id: artifactId },
      { $set: update },
      { new: true },
    );
    if (!doc) throw new Error(`Artifact ${artifactId} not found`);
    return this.documentToArtifact(doc);
  }

  async storeFile(buffer: Buffer, filename: string, mimeType: string): Promise<string> {
    await this.mongoClient.ensureConnection();
    const bucket = this.getGridFSBucket();
    return new Promise<string>((resolve, reject) => {
      const stream = bucket.openUploadStream(filename, { metadata: { contentType: mimeType } });
      stream.on("error", reject);
      stream.on("finish", () => resolve(`gridfs://${stream.id.toString()}`));
      stream.end(buffer);
    });
  }

  async readFile(storageUri: string): Promise<Buffer> {
    await this.mongoClient.ensureConnection();
    const objectId = new ObjectId(storageUri.replace("gridfs://", ""));
    const bucket = this.getGridFSBucket();
    return new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      const stream = bucket.openDownloadStream(objectId);
      stream.on("data", (chunk: Buffer) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }

  async deleteFile(storageUri: string): Promise<void> {
    await this.mongoClient.ensureConnection();
    const objectId = new ObjectId(storageUri.replace("gridfs://", ""));
    await this.getGridFSBucket().delete(objectId);
  }

  private async _verifyLibraryBelongsToUser(userId: string, libraryId: string): Promise<void> {
    const library = await this._findOne({ id: libraryId, userId } as Parameters<typeof this._findOne>[0]);
    if (!library) throw new Error(`Library ${libraryId} not found for user`);
  }
}

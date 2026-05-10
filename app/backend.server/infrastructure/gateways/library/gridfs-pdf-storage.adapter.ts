/**
 * Implements PdfStorageGateway using MongoDB GridFS.
 * URI scheme: "gridfs://<ObjectId string>"
 * Parsing of this scheme is isolated to this file only.
 */
import { Readable } from "node:stream";
import mongoose from "mongoose";
import type { PdfStorageGateway } from "@backend-application/library/pdf-storage.gateway";

function parseGridFsUri(storageUri: string): string {
  const prefix = "gridfs://";
  if (!storageUri.startsWith(prefix)) throw new Error(`Invalid GridFS URI: ${storageUri}`);
  return storageUri.slice(prefix.length);
}

function buildGridFsUri(objectId: string): string {
  return `gridfs://${objectId}`;
}

export class GridFsPdfStorageAdapter implements PdfStorageGateway {
  private get bucket(): mongoose.mongo.GridFSBucket {
    const db = mongoose.connection.db;
    if (!db) throw new Error("MongoDB not connected");
    return new mongoose.mongo.GridFSBucket(db, { bucketName: "pdfs" });
  }

  async putPdf(buffer: Buffer): Promise<{ storageUri: string }> {
    const bucket = this.bucket;
    const uploadStream = bucket.openUploadStream("upload.pdf");
    await new Promise<void>((resolve, reject) => {
      uploadStream.on("error", reject);
      uploadStream.on("finish", resolve);
      uploadStream.end(buffer);
    });
    return { storageUri: buildGridFsUri(uploadStream.id.toString()) };
  }

  async openPdfStream(storageUri: string): Promise<Readable> {
    const id = parseGridFsUri(storageUri);
    const bucket = this.bucket;
    return bucket.openDownloadStream(new mongoose.Types.ObjectId(id));
  }

  async deletePdf(storageUri: string): Promise<void> {
    const id = parseGridFsUri(storageUri);
    const bucket = this.bucket;
    await bucket.delete(new mongoose.Types.ObjectId(id));
  }
}

/**
 * Per-suite MongoDB setup using mongodb-memory-server.
 * Pinned to MongoDB 7.0 for reproducible test results.
 * Import this file from integration tests via vitest setupFiles or beforeAll.
 */
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer;

export async function startMongoMemoryServer(): Promise<string> {
  mongod = await MongoMemoryServer.create({ instance: { dbName: "test" } });
  const uri = mongod.getUri();
  await mongoose.connect(uri, { dbName: "test" });
  return uri;
}

export async function stopMongoMemoryServer(): Promise<void> {
  await mongoose.disconnect();
  await mongod.stop();
}

export function getMongoUri(): string {
  return mongod.getUri();
}

import { modelOptions, prop, Severity, type DocumentType } from "@typegoose/typegoose";
import type { Artifact, ArtifactKind, UploadStatus } from "@backend-domain/library/artifact";
import type { SourceFile } from "@backend-domain/library/artifact";

class SourceFileMongo implements SourceFile {
  @prop({ required: true, type: String })
  public storageUri!: string;

  @prop({ required: true, type: Number })
  public byteSize!: number;

  @prop({ required: true, type: String })
  public mimeType!: string;

  @prop({ required: true, type: String })
  public sha256Hash!: string;
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    versionKey: false,
  },
  options: { allowMixed: Severity.ALLOW },
})
export class ArtifactMongoModel implements Artifact {
  @prop({ unique: true, required: true, type: String })
  public id!: string;

  @prop({ required: true, type: String })
  public libraryId!: string;

  @prop({ required: true, type: String })
  public title!: string;

  @prop({ required: true, type: String })
  public kind!: ArtifactKind;

  @prop({ required: true, type: String })
  public uploadStatus!: UploadStatus;

  @prop({ required: true, type: SourceFileMongo, _id: false })
  public sourceFile!: SourceFile;

  @prop({ type: Number })
  public pageCount?: number;

  @prop({ required: true, type: Date })
  public uploadedAt!: Date;

  @prop({ type: Date })
  public processedAt?: Date;

  @prop({ required: true, type: Date })
  public createdAt!: Date;

  @prop({ required: true, type: Date })
  public updatedAt!: Date;
}

export type ArtifactMongoDocument = DocumentType<ArtifactMongoModel>;

export class FileTooSmallError extends Error {
  constructor(message = "File is too small to be a valid PDF") {
    super(message);
    this.name = "FileTooSmallError";
  }
}

export class FileTooLargeError extends Error {
  constructor(message = "File exceeds the 25 MB limit") {
    super(message);
    this.name = "FileTooLargeError";
  }
}

export class InvalidFileTypeError extends Error {
  constructor(message = "Only PDF files are supported") {
    super(message);
    this.name = "InvalidFileTypeError";
  }
}

export class DuplicateArtifactError extends Error {
  constructor(message = "This document is already in your library") {
    super(message);
    this.name = "DuplicateArtifactError";
  }
}

export class ArtifactNotFoundError extends Error {
  constructor(message = "Artifact not found") {
    super(message);
    this.name = "ArtifactNotFoundError";
  }
}

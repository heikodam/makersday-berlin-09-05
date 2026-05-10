export class InvalidPdfError extends Error {
  constructor() {
    super("Only PDF files are supported");
    this.name = "InvalidPdfError";
  }
}

export class PdfParseError extends Error {
  constructor(cause?: unknown) {
    super("Could not read PDF");
    this.name = "PdfParseError";
    if (cause instanceof Error) this.cause = cause;
  }
}

export class FileTooSmallError extends Error {
  constructor() {
    super("File is too small to be a valid PDF");
    this.name = "FileTooSmallError";
  }
}

export class FileTooLargeError extends Error {
  constructor() {
    super("File exceeds the 25 MB limit");
    this.name = "FileTooLargeError";
  }
}

export class DuplicateArtifactError extends Error {
  constructor() {
    super("This document is already in your library");
    this.name = "DuplicateArtifactError";
  }
}

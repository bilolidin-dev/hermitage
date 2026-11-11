import type { ValidationIssue } from "@/lib/domain/validation";

export type RepositoryErrorCode =
  | "not_found"
  | "validation"
  | "slug_taken"
  | "storage_unavailable"
  | "quota_exceeded"
  | "invalid_file_type"
  | "file_too_large"
  | "upload_aborted"
  | "unknown";

export class RepositoryError extends Error {
  readonly code: RepositoryErrorCode;
  readonly issues: ValidationIssue[];

  constructor(code: RepositoryErrorCode, message?: string, issues: ValidationIssue[] = []) {
    super(message ?? code);
    this.name = "RepositoryError";
    this.code = code;
    this.issues = issues;
  }
}

export function isRepositoryError(error: unknown): error is RepositoryError {
  return error instanceof RepositoryError;
}

export function errorCode(error: unknown): RepositoryErrorCode {
  return isRepositoryError(error) ? error.code : "unknown";
}

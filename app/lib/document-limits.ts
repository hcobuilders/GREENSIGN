export const MAX_PROJECT_DOCUMENT_MB = 100;
export const MAX_PROJECT_DOCUMENT_BYTES =
  MAX_PROJECT_DOCUMENT_MB * 1024 * 1024;

export function projectDocumentLimitError(fileName: string) {
  return `${fileName} exceeds the ${MAX_PROJECT_DOCUMENT_MB} MB per-file limit`;
}

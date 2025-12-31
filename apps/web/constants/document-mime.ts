const OFFICE_MIME_LIST = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

const TEXT_LIKE_MIME_LIST = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
] as const

export const OFFICE_DOCUMENT_MIME_TYPES: ReadonlySet<string> = new Set(OFFICE_MIME_LIST)
export const PLAIN_TEXT_LIKE_MIME_TYPES: ReadonlySet<string> = new Set(TEXT_LIKE_MIME_LIST)

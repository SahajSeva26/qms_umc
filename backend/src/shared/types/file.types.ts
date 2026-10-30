// The contract every business module follows to declare its file relations.
// File-handling rules (what purposes exist and their caps) live WITH the domain — the generic
// file module stays domain-agnostic and just receives the resolved relation + cap.

export interface IFileRelationConfig {
    // stored relation name; becomes part of the S3 key: {entityType}/{relation}/{fileId}.{ext}
    relation: string;
    // max ACTIVE files an entity may hold for this relation; omit for unlimited
    cap?: number;
}

// A domain's full set of file relations, keyed by a purpose code (e.g. 'SETUP', 'CHECK_IN_SELFIE').
export type FileRelationRegistry = Record<string, IFileRelationConfig>;

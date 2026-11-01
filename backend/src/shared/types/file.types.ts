export interface IEntityFileConfig {
    relation: string;
    statusAllowed: string[];
    cap: number;
    // max bytes allowed per file for this relation
    maxSize: number;
    // allowed MIME types for this relation (e.g. image/jpeg)
    mimeTypes: string[];
}

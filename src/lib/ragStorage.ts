import { toSpecFilename } from "../components/utils";

// Types
export interface RagMetadata {
    name: string;        // Unique identifier / display name
    examBoard: string;
    subject: string;
    lastModified: string;
    color?: string;      // Optional custom color (hex)
}

type ConfidenceMarks = (null | 0 | 1 | 2 | 3 | 4)[][][][];

const METADATA_KEY = "rag-metadata";
const MARKS_PREFIX = "rag-marks-";
const SPEC_PREFIX = "rag-spec-";

/**
 * Generate a safe storage key from a name
 */
export function getStorageKey(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

/**
 * Migrate old rag metadata format to new format
 * Old format: { examBoard, subject, lastModified, displayName? }
 * New format: { name, examBoard, subject, lastModified }
 */
function migrateMetadata(data: any[]): RagMetadata[] {
    return data.map((item) => {
        // If already has name field, it's new format
        if (item.name) {
            return item as RagMetadata;
        }
        
        // Migrate from old format
        const subject = item.subject || "unknown";
        const examBoard = item.examBoard || "unknown";
        const displayName = item.displayName || subject
            .split("_")
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ");
        
        return {
            name: displayName,
            examBoard,
            subject,
            lastModified: item.lastModified || new Date().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
            }),
        };
    });
}

/**
 * Get all rag metadata from localStorage
 */
export function getRagMetadata(): RagMetadata[] {
    try {
        const data = localStorage.getItem(METADATA_KEY);
        if (!data) return [];
        
        const parsed = JSON.parse(data);
        const migrated = migrateMetadata(parsed);
        
        // Check if migration happened and save back
        if (parsed.some((item: any) => !item.name)) {
            saveRagMetadata(migrated);
            
            // Also migrate marks storage keys
            parsed.forEach((oldItem: any) => {
                if (!oldItem.name && oldItem.examBoard && oldItem.subject) {
                    const oldKey = MARKS_PREFIX + `${toSpecFilename(oldItem.examBoard)}-${toSpecFilename(oldItem.subject)}`;
                    const newName = migrated.find(
                        (m) => m.examBoard === oldItem.examBoard && m.subject === oldItem.subject
                    )?.name;
                    
                    if (newName) {
                        const newKey = MARKS_PREFIX + getStorageKey(newName);
                        const marks = localStorage.getItem(oldKey);
                        if (marks && oldKey !== newKey) {
                            localStorage.setItem(newKey, marks);
                            localStorage.removeItem(oldKey);
                        }
                    }
                }
            });
        }
        
        return migrated;
    } catch {
        return [];
    }
}

/**
 * Save rag metadata to localStorage
 */
export function saveRagMetadata(metadata: RagMetadata[]): void {
    localStorage.setItem(METADATA_KEY, JSON.stringify(metadata));
}

/**
 * Check if a rag name already exists
 */
export function ragNameExists(name: string): boolean {
    const metadata = getRagMetadata();
    return metadata.some((r) => r.name.toLowerCase() === name.toLowerCase());
}

/**
 * Generate a unique name by appending (1), (2), etc. if needed
 */
export function generateUniqueName(baseName: string): string {
    if (!ragNameExists(baseName)) {
        return baseName;
    }
    
    let counter = 1;
    let newName = `${baseName} (${counter})`;
    while (ragNameExists(newName)) {
        counter++;
        newName = `${baseName} (${counter})`;
    }
    return newName;
}

/**
 * Get a rag by name
 */
export function getRagByName(name: string): RagMetadata | null {
    const metadata = getRagMetadata();
    return metadata.find((r) => r.name.toLowerCase() === name.toLowerCase()) || null;
}

/**
 * Create a new rag
 */
export function createRag(name: string, examBoard: string, subject: string): RagMetadata {
    const metadata = getRagMetadata();
    
    const now = new Date().toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    const newRag: RagMetadata = { name, examBoard, subject, lastModified: now };
    metadata.push(newRag);
    saveRagMetadata(metadata);
    
    return newRag;
}

/**
 * Update a rag's lastModified timestamp
 */
export function touchRag(name: string): void {
    const metadata = getRagMetadata();
    const existingIdx = metadata.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());

    if (existingIdx >= 0) {
        const now = new Date().toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
        });
        metadata[existingIdx].lastModified = now;
        saveRagMetadata(metadata);
    }
}

/**
 * Update a rag's color
 */
export function updateRagColor(name: string, color: string | undefined): void {
    const metadata = getRagMetadata();
    const existingIdx = metadata.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());

    if (existingIdx >= 0) {
        metadata[existingIdx].color = color;
        saveRagMetadata(metadata);
    }
}

/**
 * Rename a rag
 */
export function renameRag(oldName: string, newName: string): boolean {
    if (oldName.toLowerCase() === newName.toLowerCase()) {
        // Just update case
        const metadata = getRagMetadata();
        const idx = metadata.findIndex((r) => r.name.toLowerCase() === oldName.toLowerCase());
        if (idx >= 0) {
            metadata[idx].name = newName;
            saveRagMetadata(metadata);
        }
        return true;
    }
    
    if (ragNameExists(newName)) {
        return false; // Name already taken
    }
    
    const metadata = getRagMetadata();
    const idx = metadata.findIndex((r) => r.name.toLowerCase() === oldName.toLowerCase());
    if (idx < 0) return false;
    
    // Update metadata
    metadata[idx].name = newName;
    saveRagMetadata(metadata);
    
    // Migrate marks storage
    const oldKey = MARKS_PREFIX + getStorageKey(oldName);
    const newKey = MARKS_PREFIX + getStorageKey(newName);
    const marks = localStorage.getItem(oldKey);
    if (marks) {
        localStorage.setItem(newKey, marks);
        localStorage.removeItem(oldKey);
    }
    
    return true;
}

/**
 * Get confidence marks for a rag by name
 */
export function getRagMarks(name: string): ConfidenceMarks | null {
    try {
        const key = MARKS_PREFIX + getStorageKey(name);
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Save confidence marks for a rag by name
 */
export function saveRagMarks(name: string, marks: ConfidenceMarks): void {
    const key = MARKS_PREFIX + getStorageKey(name);
    localStorage.setItem(key, JSON.stringify(marks));
    touchRag(name);
}

/**
 * Get cached spec data (still keyed by examBoard+subject since specs are shared)
 */
export function getCachedSpec(examBoard: string, subject: string): unknown | null {
    try {
        const key = SPEC_PREFIX + `${toSpecFilename(examBoard)}-${toSpecFilename(subject)}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

/**
 * Cache spec data
 */
export function cacheSpec(examBoard: string, subject: string, specData: unknown): void {
    const key = SPEC_PREFIX + `${toSpecFilename(examBoard)}-${toSpecFilename(subject)}`;
    localStorage.setItem(key, JSON.stringify(specData));
}

/**
 * Delete a rag completely
 */
export function deleteRag(name: string): void {
    const metadata = getRagMetadata();
    const filtered = metadata.filter((r) => r.name.toLowerCase() !== name.toLowerCase());
    saveRagMetadata(filtered);

    const key = MARKS_PREFIX + getStorageKey(name);
    localStorage.removeItem(key);
}

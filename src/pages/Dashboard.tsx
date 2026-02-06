import { useState, useEffect } from "react";
import {
    Upload,
    FileText,
    Calendar,
    ChevronRight,
    Sparkles,
    ExternalLink,
    Pencil,
    Check,
    X,
    Trash2,
    Download,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { toSpecFilename } from "../components/utils";
import {
    getRagMetadata,
    saveRagMarks,
    renameRag,
    createRag,
    generateUniqueName,
    deleteRag,
    getRagMarks,
    updateRagColor,
    type RagMetadata,
} from "../lib/ragStorage";

/*
confidence === "high" ?
    "from-emerald-500/20 to-emerald-900/20 text-emerald-400"
: rag.confidence === "medium" ?
    "from-amber-500/20 to-amber-900/20 text-amber-400"
:   "from-rose-500/20 to-rose-900/20 text-rose-400"
*/

// Color palette for rag icons based on subject name hash
const defaultColors = [
    "#10b981", // emerald
    "#f43f5e", // rose
    "#f59e0b", // amber
    "#3b82f6", // blue
    "#a855f7", // purple
    "#06b6d4", // cyan
];

function getDefaultColor(name: string): string {
    // Simple hash based on string
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return defaultColors[Math.abs(hash) % defaultColors.length];
}

// Darken a hex color by a percentage
function darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent));
    const g = Math.max(0, ((num >> 8) & 0x00ff) - Math.round(255 * percent));
    const b = Math.max(0, (num & 0x0000ff) - Math.round(255 * percent));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// Get the icon gradient style for a rag
function getIconGradientStyle(color: string): React.CSSProperties {
    const darkerColor = darkenColor(color, 0.25);
    return {
        background: `linear-gradient(to bottom right, ${color}33, ${darkerColor}33)`,
        color: color,
    };
}

function formatSubjectName(subject: string): string {
    return subject
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}

// Parse spec identifier like "cs-ocr" into examBoard and subject
function parseSpecId(specId: string): { examBoard: string; subject: string } | null {
    // Common mappings for spec IDs
    const specMappings: Record<string, { examBoard: string; subject: string }> = {
        "cs-ocr": { examBoard: "ocr", subject: "computer_science" },
        "maths-ocr": { examBoard: "ocr", subject: "maths" },
        "maths-ocr_mei": { examBoard: "ocr_mei", subject: "maths" },
    };

    if (specMappings[specId]) {
        return specMappings[specId];
    }

    // Try to parse generic format: "subject-board"
    const parts = specId.split("-");
    if (parts.length >= 2) {
        return {
            subject: parts[0],
            examBoard: parts.slice(1).join("-"),
        };
    }

    return null;
}

// Convert old .cms format (version 0) marks to new 4D format
// The old format is a flat array that maps to spec points
async function convertCmsMarks(
    flatMarks: number[],
    examBoard: string,
    subject: string,
): Promise<ConfidenceLevel[][][][] | null> {
    try {
        // Fetch the spec to know the structure
        const specUrl = `/specs/${toSpecFilename(examBoard)}/${toSpecFilename(subject)}.json`;
        const res = await fetch(specUrl);
        if (!res.ok) return null;

        const spec = await res.json();
        let marksIndex = 0;

        // Build 4D marks array from flat array based on spec structure
        const marks: ConfidenceLevel[][][][] = spec.map((component: any) =>
            component.items.map((section: any) =>
                section.items.map((subsection: any) =>
                    (subsection.points ?? []).map(() => {
                        // Old format uses 1-3 for confidence, 0 for unset
                        // Map: 0 -> null (unset), 1 -> 0 (red), 2 -> 2 (amber), 3 -> 4 (green)
                        const oldMark = flatMarks[marksIndex++];
                        if (oldMark === undefined || oldMark === 0) return null as ConfidenceLevel;
                        if (oldMark === 1) return 0 as ConfidenceLevel;
                        if (oldMark === 2) return 2 as ConfidenceLevel;
                        if (oldMark === 3) return 4 as ConfidenceLevel;
                        return null as ConfidenceLevel;
                    }),
                ),
            ),
        );

        return marks;
    } catch {
        return null;
    }
}

// Import handler for processing files
interface ImportResult {
    success: boolean;
    ragName?: string;
    examBoard?: string;
    subject?: string;
    error?: string;
}

async function processImportedFile(
    content: string,
    ext: string,
    fileName: string,
): Promise<ImportResult> {
    try {
        const data = JSON.parse(content);

        // Check if it's a .cms file (version 0 / old format)
        if (ext === "cms" || (typeof data.student === "string" && Array.isArray(data.marks))) {
            // Validate old format
            if (!Array.isArray(data.marks)) {
                return { success: false, error: "Invalid .cms file: missing marks array" };
            }

            // .cms files are always OCR Computer Science
            const examBoard = "ocr";
            const subject = "computer_science";

            const marks = await convertCmsMarks(data.marks, examBoard, subject);
            if (!marks) {
                return { success: false, error: "Failed to convert marks - spec not found" };
            }

            // Use filename as the rag name, ensure uniqueness
            const ragName = generateUniqueName(fileName);
            createRag(ragName, examBoard, subject);
            saveRagMarks(ragName, marks);
            return { success: true, ragName, examBoard, subject };
        }

        // Check if it's a new format (version 1+)
        if (typeof data.version === "number" && data.version >= 1) {
            if (!data.spec || !Array.isArray(data.marks)) {
                return { success: false, error: "Invalid file: missing spec or marks" };
            }

            const parsed = parseSpecId(data.spec);
            if (!parsed) {
                return { success: false, error: `Unknown spec format: ${data.spec}` };
            }

            // Use filename as the rag name, ensure uniqueness
            const ragName = generateUniqueName(fileName);
            createRag(ragName, parsed.examBoard, parsed.subject);
            saveRagMarks(ragName, data.marks);
            return { success: true, ragName, ...parsed };
        }

        return { success: false, error: "Unknown file format" };
    } catch (e) {
        return { success: false, error: `Parse error: ${e}` };
    }
}

// Very hacky approach, sadly I couldn't find something better
// Create a hidden file input for the file picker function
let onFileImported: ((results: ImportResult[]) => void) | null = null;

const hiddenInp = document.createElement("input");
{
    hiddenInp.id = "ragSelector";
    hiddenInp.type = "file";
    hiddenInp.multiple = true;
    hiddenInp.accept = ".json,.cms";

    hiddenInp.onchange = async (e: Event) => {
        const fileHandles = (e.target as HTMLInputElement)?.files;
        if (!fileHandles?.length) return;

        const results: ImportResult[] = [];

        for (const file of fileHandles) {
            const match = file.name.match(/^(.+?)(?:\.([^.]+))?$/);
            if (!match) continue;

            const [, fileName, ext = ""] = match;
            if (!ext || !fileName) continue;

            const content = await file.text();
            const result = await processImportedFile(content, ext.toLowerCase(), fileName);
            results.push(result);
        }

        // Reset input so same file can be selected again
        hiddenInp.value = "";

        if (onFileImported) {
            onFileImported(results);
        }
    };
}

// Function is not used rn (and probably never will be)
async function openRagFilePicker() {
    hiddenInp.click();
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [savedRags, setSavedRags] = useState<RagMetadata[]>([]);
    const [editingRag, setEditingRag] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editError, setEditError] = useState<string | null>(null);
    const [deletingRag, setDeletingRag] = useState<string | null>(null);
    const [colorPickerRag, setColorPickerRag] = useState<string | null>(null);

    // Load rags from localStorage on mount
    useEffect(() => {
        setSavedRags(getRagMetadata());
    }, []);

    const openColorPicker = (rag: RagMetadata, e: React.MouseEvent) => {
        e.stopPropagation();
        setColorPickerRag(rag.name);
    };

    const selectColor = (ragName: string, color: string) => {
        updateRagColor(ragName, color);
        setSavedRags(getRagMetadata());
        setColorPickerRag(null);
    };

    const closeColorPicker = () => {
        setColorPickerRag(null);
    };

    const startDeleting = (rag: RagMetadata, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeletingRag(rag.name);
    };

    const confirmDelete = () => {
        if (deletingRag) {
            deleteRag(deletingRag);
            setSavedRags(getRagMetadata());
            setDeletingRag(null);
        }
    };

    const cancelDelete = () => {
        setDeletingRag(null);
    };

    const downloadRag = (rag: RagMetadata, e: React.MouseEvent) => {
        e.stopPropagation();
        const marks = getRagMarks(rag.name);
        const data = {
            version: 1,
            spec: `${rag.subject}-${rag.examBoard}`,
            marks: marks || [],
            lastModified: rag.lastModified,
        };

        const blob = new Blob([JSON.stringify(data, null)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${rag.name}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const startEditing = (rag: RagMetadata, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRag(rag.name);
        setEditName(rag.name);
        setEditError(null);
    };

    const saveEdit = (rag: RagMetadata, e: React.MouseEvent) => {
        e.stopPropagation();
        const trimmedName = editName.trim();

        if (!trimmedName) {
            setEditError("Name cannot be empty");
            return;
        }

        const success = renameRag(rag.name, trimmedName);
        if (!success) {
            setEditError("Name already exists");
            return;
        }

        setSavedRags(getRagMetadata());
        setEditingRag(null);
        setEditError(null);
    };

    const cancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRag(null);
        setEditError(null);
    };

    // Handle file import results
    const handleImportResults = (results: ImportResult[]) => {
        // Refresh the list
        setSavedRags(getRagMetadata());

        // Navigate to the first successfully imported rag
        const firstSuccess = results.find((r) => r.success);
        if (firstSuccess && firstSuccess.ragName) {
            navigate(`/rag/${encodeURIComponent(firstSuccess.ragName)}`);
        } else {
            // Show errors in console for now
            results.forEach((r) => {
                if (!r.success) {
                    console.error("Import failed:", r.error);
                }
            });
        }
    };

    // Set up the callback for file imports
    useEffect(() => {
        onFileImported = handleImportResults;
        return () => {
            onFileImported = null;
        };
    }, [navigate]);

    const handleRagClick = (rag: RagMetadata) => {
        navigate(`/rag/${encodeURIComponent(rag.name)}`);
    };

    return (
        <>
            {/* Header Section */}
            <div className="text-center my-16 space-y-4 animate-fade-in-up">
                <div className="inline-flex items-center justify-center px-3 py-1 mb-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                    <Sparkles className="w-3 h-3 text-amber-300 mr-2" />
                    <span className="text-xs font-medium tracking-wider text-slate-300 uppercase">
                        AI Edition
                    </span>
                </div>

                <h1 className="text-5xl md:text-6xl font-serif font-medium tracking-tight text-white drop-shadow-sm">
                    <a
                        href="https://cms-db.deno.dev"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 border-b-2 border-indigo-500/50 pb-1 mr-3 hover:border-indigo-400 transition-colors group">
                        cms-db
                        <ExternalLink className="w-5 h-5 opacity-15 group-hover:opacity-70 transition-opacity duration-300" />
                    </a>
                    <span className="text-slate-400 italic font-light text-4xl md:text-5xl">
                        but a bit better
                    </span>
                </h1>
                <p className="text-slate-400 max-w-lg mx-auto text-lg font-light leading-relaxed">
                    Track your confidence across subject's specs with a slightly more polished UI.
                </p>
            </div>

            {/* Import Button */}
            <div className="w-full max-w-md mx-auto mb-12 flex flex-col items-center space-y-8">
                <Button
                    onClick={openRagFilePicker}
                    variant="primary"
                    className="w-full py-4 text-base shadow-indigo-500/20"
                    icon={<Upload className="w-5 h-5" />}>
                    Import from file
                </Button>

                <div className="relative w-full flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10"></div>
                    </div>
                    <div className="relative bg-[#0f172a] px-4 text-sm text-slate-500 font-serif italic">
                        or
                    </div>
                </div>
            </div>

            {/* List Section */}
            <div className="max-w-4xl w-full space-y-6">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h2 className="text-xl font-serif text-white/90">Choose from localstorage</h2>
                    <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                        Saved Rags
                    </span>
                </div>

                <div className="space-y-4">
                    {savedRags.length === 0 ?
                        <div className="text-center py-12 text-slate-500">
                            <p>No saved rags yet.</p>
                            <p className="text-sm mt-2">
                                Import a file or create a new rag to get started.
                            </p>
                        </div>
                    :   savedRags.map((rag) => {
                            const isEditing = editingRag === rag.name;
                            const ragColor = rag.color || getDefaultColor(rag.name);

                            return (
                                <GlassCard
                                    key={rag.name}
                                    hoverEffect={!isEditing}
                                    onClick={() => !isEditing && handleRagClick(rag)}
                                    className="group p-5 md:p-6 animate-fade-in"
                                    classNameForChildren="flex flex-row items-center justify-between">
                                    <div className="flex items-center space-x-4 md:space-x-6">
                                        <button
                                            onClick={(e) => openColorPicker(rag, e)}
                                            className="w-12 h-12 rounded-full flex items-center justify-center border border-white/10 shadow-inner hover:scale-105 hover:border-white/30 transition-all"
                                            style={getIconGradientStyle(ragColor)}
                                            title="Change color">
                                            <FileText className="w-5 h-5" />
                                        </button>

                                        <div className="flex flex-col">
                                            {isEditing ?
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            value={editName}
                                                            onChange={(e) => {
                                                                setEditName(e.target.value);
                                                                setEditError(null);
                                                            }}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter")
                                                                    saveEdit(rag, e as any);
                                                                if (e.key === "Escape")
                                                                    cancelEdit(e as any);
                                                            }}
                                                            onClick={(e) => e.stopPropagation()}
                                                            autoFocus
                                                            className={`bg-slate-800/50 border rounded px-2 py-1 text-lg font-medium text-white focus:outline-none ${
                                                                editError ? "border-red-500" : (
                                                                    "border-white/20 focus:border-indigo-500"
                                                                )
                                                            }`}
                                                        />
                                                        <button
                                                            onClick={(e) => saveEdit(rag, e)}
                                                            className="p-1 hover:bg-green-500/20 rounded transition-colors">
                                                            <Check className="w-4 h-4 text-green-400" />
                                                        </button>
                                                        <button
                                                            onClick={cancelEdit}
                                                            className="p-1 hover:bg-red-500/20 rounded transition-colors">
                                                            <X className="w-4 h-4 text-red-400" />
                                                        </button>
                                                    </div>
                                                    {editError && (
                                                        <span className="text-xs text-red-400">
                                                            {editError}
                                                        </span>
                                                    )}
                                                </div>
                                            :   <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-medium text-white group-hover:text-indigo-300 transition-colors">
                                                        {rag.name}
                                                    </h3>
                                                    <button
                                                        onClick={(e) => startEditing(rag, e)}
                                                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-white/10 rounded transition-all">
                                                        <Pencil className="w-3 h-3 text-slate-400" />
                                                    </button>
                                                </div>
                                            }
                                            <div className="flex items-center space-x-3 text-sm text-slate-400 mt-1">
                                                <span className="bg-white/5 px-2 py-0.5 rounded text-xs border border-white/5">
                                                    {rag.examBoard.toUpperCase()}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                <span className="text-slate-500 text-xs">
                                                    {formatSubjectName(rag.subject)}
                                                </span>
                                                <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                <span className="flex items-center">
                                                    <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                                                    {rag.lastModified}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={(e) => downloadRag(rag, e)}
                                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-indigo-500/20 rounded-lg transition-all"
                                            title="Download">
                                            <Download className="w-4 h-4 text-indigo-400" />
                                        </button>
                                        <button
                                            onClick={(e) => startDeleting(rag, e)}
                                            className="p-2 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded-lg transition-all"
                                            title="Delete">
                                            <Trash2 className="w-4 h-4 text-red-400" />
                                        </button>
                                        <div className="text-slate-500 group-hover:text-white transition-colors duration-300 ml-2">
                                            <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })
                    }
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {deletingRag && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={cancelDelete}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div>
                                <h3 className="text-lg font-medium text-white mb-1">Delete Rag</h3>
                                <p className="text-sm text-slate-400">
                                    Are you sure you want to delete{" "}
                                    <span className="text-white font-medium">"{deletingRag}"</span>?
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full pt-2">
                                <button
                                    onClick={cancelDelete}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium transition-all">
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 hover:text-red-300 font-medium transition-all flex items-center justify-center gap-2">
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Color Picker Modal */}
            {colorPickerRag && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center"
                    onClick={closeColorPicker}>
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                    {/* Modal */}
                    <div
                        className="relative bg-slate-900/95 border border-white/10 rounded-2xl p-6 shadow-2xl max-w-xs w-full mx-4 animate-fade-in"
                        onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center text-center space-y-4">
                            <h3 className="text-lg font-medium text-white">Choose a Color</h3>
                            <div className="grid grid-cols-4 gap-3">
                                {[
                                    "#ef4444", // red
                                    "#f97316", // orange
                                    "#f59e0b", // amber
                                    "#eab308", // yellow
                                    "#84cc16", // lime
                                    "#22c55e", // green
                                    "#10b981", // emerald
                                    "#14b8a6", // teal
                                    "#06b6d4", // cyan
                                    "#0ea5e9", // sky
                                    "#3b82f6", // blue
                                    "#6366f1", // indigo
                                    "#8b5cf6", // violet
                                    "#a855f7", // purple
                                    "#d946ef", // fuchsia
                                    "#ec4899", // pink
                                ].map((color) => {
                                    const currentColor = savedRags.find(r => r.name === colorPickerRag)?.color || getDefaultColor(colorPickerRag);
                                    const isSelected = currentColor === color;
                                    return (
                                        <button
                                            key={color}
                                            onClick={() => selectColor(colorPickerRag, color)}
                                            className={`w-10 h-10 rounded-full border-2 transition-all hover:scale-110 ${
                                                isSelected ? "border-white scale-110 ring-2 ring-white/30" : "border-transparent"
                                            }`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    );
                                })}
                            </div>
                            <button
                                onClick={closeColorPicker}
                                className="w-full px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-medium transition-all mt-2">
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

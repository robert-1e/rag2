import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle2, ChevronRight, ChevronDown } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";
import { toSpecFilename } from "../components/utils";
import { getRagMarks, saveRagMarks, cacheSpec, getCachedSpec, getRagByName } from "../lib/ragStorage";

// Types for the spec structure from JSON
interface SpecSubsection {
    name: string;
    points?: string[];
    items?: string[];
    intro?: string;
    outro?: string;
}

interface SpecSection {
    name: string;
    items: SpecSubsection[];
    intro?: string;
}

interface SpecComponent {
    name: string;
    items: SpecSection[];
}

type SpecData = SpecComponent[];

// Confidence marks stored as: [componentIdx][sectionIdx][subsectionIdx][pointIdx]
type ConfidenceMarks = ConfidenceLevel[][][][];

interface RagDetailPageProps {
    ragName: string;
    onBack: () => void;
}

const confidenceColours = {
    null: {
        bg: "bg-grey-500",
        // Other ones are never used as there is no null radio button
        text: "",
        border: "",
        glow: "",
        gradient: "from-slate-600/30",
    },
    0: {
        bg: "bg-red-500",
        text: "text-red-500",
        border: "border-red-500/50",
        glow: "shadow-red-500/50",
        gradient: "from-red-500/30",
    },
    1: {
        bg: "bg-orange-500",
        text: "text-orange-500",
        border: "border-orange-500/50",
        glow: "shadow-orange-500/50",
        gradient: "from-orange-500/30",
    },
    2: {
        bg: "bg-amber-400",
        text: "text-amber-400",
        border: "border-amber-400/50",
        glow: "shadow-amber-400/50",
        gradient: "from-amber-400/30",
    },
    3: {
        bg: "bg-lime-400",
        text: "text-lime-400",
        border: "border-lime-400/50",
        glow: "shadow-lime-400/50",
        gradient: "from-lime-400/30",
    },
    4: {
        bg: "bg-green-500",
        text: "text-green-500",
        border: "border-green-500/50",
        glow: "shadow-green-500/50",
        gradient: "from-green-500/30",
    },
};
function getConfColour(confidence: ConfidenceLevel) {
    if (confidence === null) return confidenceColours.null;
    else return confidenceColours[confidence];
}

// Subsection component props
interface SubsectionProps {
    subsection: SpecSubsection;
    subsectionKey: string;
    isExpanded: boolean;
    onToggle: () => void;
    pointMarks: ConfidenceLevel[];
    onConfidenceChange: (pointIdx: number, level: ConfidenceLevel) => void;
    isPointVisible: (pointIdx: number) => boolean;
}

function Subsection({
    subsection,
    subsectionKey,
    isExpanded,
    onToggle,
    pointMarks,
    onConfidenceChange,
    isPointVisible,
}: SubsectionProps) {
    const points = subsection.points ?? [];
    const hasVisiblePoints = points.some((_, pi) => isPointVisible(pi));

    if (!hasVisiblePoints && points.length > 0) {
        return null;
    }

    return (
        <div key={subsectionKey} className="space-y-1">
            {/* Subsection Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 p-2 hover:bg-slate-800/30 rounded-md transition-all">
                {isExpanded ?
                    <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
                :   <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />}
                <span className="text-sm font-medium text-slate-300 text-left">
                    {subsection.name}
                </span>
            </button>

            {/* Points within Subsection */}
            {isExpanded && (
                <div className="ml-[14px] pl-4 space-y-1 border-l border-white/20">
                    {points.map((point, pointIdx) => {
                        if (!isPointVisible(pointIdx)) {
                            return null;
                        }

                        const confidence = pointMarks[pointIdx] ?? null;

                        const cycleConfidence = (n = 1) => {
                            onConfidenceChange(
                                pointIdx,
                                confidence !== null ?
                                    (((confidence + 5 + n) % 5) as ConfidenceLevel)
                                :   0,
                            );
                        };

                        return (
                            <GlassCard
                                key={pointIdx}
                                className={`transition-all duration-300 [&:hover:not(:has(button:hover))]:bg-slate-700/50 bg-gradient-to-r ${getConfColour(confidence).gradient} to-transparent`}
                                onClick={() => cycleConfidence()}
                                onContextMenu={(e) => {
                                    e.preventDefault();
                                    cycleConfidence(-1);
                                }}>
                                <div className="p-3 md:p-4 flex items-start justify-between gap-4">
                                    <span className="text-slate-200 text-sm select-none leading-relaxed flex-1">
                                        {point}
                                    </span>

                                    {/* Confidence Selector */}
                                    <div className="flex items-center gap-1.5 flex-shrink-0">
                                        {([0, 1, 2, 3, 4] as ConfidenceLevel[]).map((level) => (
                                            <button
                                                key={level}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onConfidenceChange(pointIdx, level);
                                                }}
                                                className={`w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center ${
                                                    confidence === level ?
                                                        `${getConfColour(level).bg} scale-110 shadow-lg ${getConfColour(level).glow} ring-2 ring-white/20`
                                                    :   "bg-slate-800/50 hover:bg-slate-700/70 border border-white/5 hover:scale-105"
                                                }`}
                                                aria-label={`Set confidence to level ${level}`}>
                                                {confidence === level && (
                                                    <CheckCircle2 className="w-3 h-3 text-white/90 drop-shadow-md" />
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Helper to initialize marks structure from spec data
function initializeMarks(spec: SpecData): ConfidenceMarks {
    return spec.map((component) =>
        component.items.map((section) =>
            section.items.map((subsection) =>
                (subsection.points ?? []).map(() => null as ConfidenceLevel),
            ),
        ),
    );
}

// Helper to count all points and filtered points
function countPoints(spec: SpecData, marks: ConfidenceMarks, filters: Set<ConfidenceLevel>) {
    let total = 0;
    let filtered = 0;
    spec.forEach((component, ci) => {
        component.items.forEach((section, si) => {
            section.items.forEach((subsection, ssi) => {
                (subsection.points ?? []).forEach((_, pi) => {
                    total++;
                    const conf = marks[ci]?.[si]?.[ssi]?.[pi] ?? null;
                    if (filters.has(conf)) filtered++;
                });
            });
        });
    });
    return { total, filtered };
}

export default function RagViewer({ ragName, onBack }: RagDetailPageProps) {
    const navigate = useNavigate();
    const [specData, setSpecData] = useState<SpecData | null>(null);
    const [marks, setMarks] = useState<ConfidenceMarks>([]);
    const [lastModified, setLastModified] = useState<string>("");
    const [selectedFilters, setSelectedFilters] = useState<Set<ConfidenceLevel>>(
        new Set([null, 0, 1, 2, 3, 4]),
    );
    const [expandedComponents, setExpandedComponents] = useState<Set<number>>(new Set());
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
    const [expandedSubsections, setExpandedSubsections] = useState<Set<string>>(new Set());

    // Save marks to localStorage
    const saveMarks = useCallback(() => {
        if (marks.length > 0) {
            saveRagMarks(ragName, marks);
        }
    }, [ragName, marks]);

    // Load rag metadata and spec data on mount
    useEffect(() => {
        const rag = getRagByName(ragName);
        if (!rag) {
            // Rag not found, redirect to dashboard
            navigate("/dashboard");
            return;
        }

        setLastModified(rag.lastModified);

        const specUrl = `/specs/${toSpecFilename(rag.examBoard)}/${toSpecFilename(rag.subject)}.json`;
        
        // Try to load cached spec first
        const cachedSpec = getCachedSpec(rag.examBoard, rag.subject);
        
        const loadSpec = (data: SpecData) => {
            setSpecData(data);
            
            // Try to load existing marks from localStorage
            const savedMarks = getRagMarks(ragName);
            if (savedMarks) {
                setMarks(savedMarks);
            } else {
                setMarks(initializeMarks(data));
            }

            // Expand all sections by default
            const allComponents = new Set<number>();
            const allSections = new Set<string>();
            const allSubsections = new Set<string>();

            data.forEach((component, ci) => {
                allComponents.add(ci);
                component.items.forEach((section, si) => {
                    allSections.add(`${ci}-${si}`);
                    section.items.forEach((_, ssi) => {
                        allSubsections.add(`${ci}-${si}-${ssi}`);
                    });
                });
            });

            setExpandedComponents(allComponents);
            setExpandedSections(allSections);
            setExpandedSubsections(allSubsections);
        };

        if (cachedSpec) {
            loadSpec(cachedSpec as SpecData);
        }

        // Always fetch fresh spec (will update if cached was stale)
        fetch(specUrl)
            .then((res) => {
                if (!res.ok) throw new Error("Spec not found");
                return res.json();
            })
            .then((data: SpecData) => {
                cacheSpec(rag.examBoard, rag.subject, data);
                if (!cachedSpec) {
                    loadSpec(data);
                }
            })
            .catch((err) => {
                console.error(err);
                if (!cachedSpec) {
                    // No cached version and fetch failed - redirect immediately
                    navigate("/dashboard");
                }
            });
    }, [ragName, navigate]);

    // Save on page unload
    useEffect(() => {
        const handleBeforeUnload = () => {
            saveMarks();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            // Also save when component unmounts
            saveMarks();
        };
    }, [saveMarks]);

    const handleConfidenceChange = (
        componentIdx: number,
        sectionIdx: number,
        subsectionIdx: number,
        pointIdx: number,
        level: ConfidenceLevel,
    ) => {
        setMarks((prev) => {
            const newMarks = [...prev];
            newMarks[componentIdx] = [...newMarks[componentIdx]];
            newMarks[componentIdx][sectionIdx] = [...newMarks[componentIdx][sectionIdx]];
            newMarks[componentIdx][sectionIdx][subsectionIdx] = [
                ...newMarks[componentIdx][sectionIdx][subsectionIdx],
            ];
            const current = newMarks[componentIdx][sectionIdx][subsectionIdx][pointIdx];
            newMarks[componentIdx][sectionIdx][subsectionIdx][pointIdx] =
                current === level ? null : level;
            return newMarks;
        });
    };

    const toggleFilter = (level: ConfidenceLevel) => {
        setSelectedFilters((prev) => {
            const next = new Set(prev);
            if (next.has(level)) {
                next.delete(level);
            } else {
                next.add(level);
            }
            return next;
        });
    };

    const toggleComponent = (idx: number) => {
        setExpandedComponents((prev) => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const toggleSection = (key: string) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSubsection = (key: string) => {
        setExpandedSubsections((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const pointCounts = useMemo(() => {
        if (!specData) return { total: 0, filtered: 0 };
        return countPoints(specData, marks, selectedFilters);
    }, [specData, marks, selectedFilters]);

    // Check if a point should be visible based on filters
    const isPointVisible = (
        componentIdx: number,
        sectionIdx: number,
        subsectionIdx: number,
        pointIdx: number,
    ) => {
        const conf = marks[componentIdx]?.[sectionIdx]?.[subsectionIdx]?.[pointIdx] ?? null;
        return selectedFilters.has(conf);
    };

    // Check if a subsection has any visible points
    const hasVisiblePointsInSubsection = (
        componentIdx: number,
        sectionIdx: number,
        subsectionIdx: number,
    ) => {
        const points = specData?.[componentIdx]?.items[sectionIdx]?.items[subsectionIdx]?.points ?? [];
        return points.some((_, pi) => isPointVisible(componentIdx, sectionIdx, subsectionIdx, pi));
    };

    // Check if a section has any visible subsections
    const hasVisibleSubsections = (componentIdx: number, sectionIdx: number) => {
        const subsections = specData?.[componentIdx]?.items[sectionIdx]?.items ?? [];
        return subsections.some((_, ssi) => hasVisiblePointsInSubsection(componentIdx, sectionIdx, ssi));
    };

    // Check if a component has any visible sections
    const hasVisibleSections = (componentIdx: number) => {
        const sections = specData?.[componentIdx]?.items ?? [];
        return sections.some((_, si) => hasVisibleSubsections(componentIdx, si));
    };

    if (!specData) {
        return (
            <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in flex items-center justify-center min-h-[50vh]">
                <div className="text-slate-400">Loading specification...</div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto px-4 animate-fade-in">
            {/* Header */}
            <div className="mb-0 space-y-6">
                <Button
                    variant="glass"
                    onClick={onBack}
                    className="pl-3 pr-4 py-2 text-sm rounded-full hover:pl-2 transition-all"
                    icon={<ArrowLeft className="w-4 h-4" />}>
                    Back to dashboard
                </Button>

                <div className="space-y-2">
                    <h1 className="text-4xl md:text-5xl font-serif font-medium text-white drop-shadow-sm">
                        {ragName}
                    </h1>
                    <div>
                        <div className="flex items-center text-slate-400 text-sm font-light">
                            <Clock className="w-4 h-4 mr-2 opacity-70" />
                            <span>Last modified: {lastModified}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spec Points List */}
            <div className="space-y-3 pb-20">
                {/* Filter Bar */}
                <div className="flex flex-col items-center gap-3 p-3 rounded-xl">
                    <div className="ml-auto mr-0 md:mr-5 flex items-center gap-2 p-1">
                        <span className="text-slate-400 text-sm font-medium mr-2">Filter:</span>
                        <div className="flex items-center gap-2">
                            {([0, 1, 2, 3, 4] as ConfidenceLevel[]).map((level) => (
                                <button
                                    key={level}
                                    onClick={() => toggleFilter(level)}
                                    className={`w-8 h-8 first:rounded-l-full last:rounded-r-full transition-all duration-300 flex items-center justify-center ${
                                        selectedFilters.has(level) ?
                                            `${getConfColour(level).bg} scale-110 shadow-lg ${getConfColour(level).glow} ring-2 ring-white/20`
                                        :   "bg-slate-800/50 hover:bg-slate-700/70 border border-white/5 hover:scale-105"
                                    }`}
                                    aria-label={`Filter by confidence level ${level}`}></button>
                            ))}
                        </div>
                    </div>
                    <span className="ml-auto text-slate-500 text-xs">
                        {pointCounts.filtered} / {pointCounts.total} points shown
                    </span>
                </div>

                <div className="">
                    {/* Components (top level sections) */}
                    {pointCounts.filtered === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <p className="text-slate-400 text-sm">
                                No points match the current filter.
                            </p>
                            <button
                                onClick={() => setSelectedFilters(new Set([null, 0, 1, 2, 3, 4]))}
                                className="mt-3 px-4 py-2 text-xs text-slate-300 hover:text-white bg-slate-800/50 hover:bg-slate-700/70 rounded-full border border-white/10 transition-all">
                                Reset filters
                            </button>
                        </div>
                    ) : (
                        specData.map((component, componentIdx) => {
                        if (!hasVisibleSections(componentIdx)) {
                            return null;
                        }

                        return (
                            <div key={componentIdx} className="space-y-2">
                                {/* Component Header */}
                                <button
                                    onClick={() => toggleComponent(componentIdx)}
                                    className="w-full flex items-center gap-3 p-4 hover:bg-slate-700/10 rounded-xl transition-all">
                                    {expandedComponents.has(componentIdx) ?
                                        <ChevronDown className="w-5 h-5 text-slate-400 flex-shrink-0" />
                                    :   <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0" />}
                                    <span className="text-xl font-semibold text-white">
                                        {component.name}
                                    </span>
                                </button>

                                {/* Sections within Component */}
                                {expandedComponents.has(componentIdx) && (
                                    <div className="ml-[26px] pl-1 space-y-2 border-l border-white/20">
                                        {component.items.map((section, sectionIdx) => {
                                            const sectionKey = `${componentIdx}-${sectionIdx}`;

                                            if (!hasVisibleSubsections(componentIdx, sectionIdx)) {
                                                return null;
                                            }

                                            return (
                                                <div key={sectionKey} className="space-y-2">
                                                    {/* Section Header */}
                                                    <button
                                                        onClick={() => toggleSection(sectionKey)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/10 rounded-lg transition-all">
                                                        {expandedSections.has(sectionKey) ?
                                                            <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                        :   <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                                        }
                                                        <span className="text-base font-medium text-slate-200 text-left">
                                                            {section.name}
                                                        </span>
                                                    </button>

                                                    {/* Subsections within Section */}
                                                    {expandedSections.has(sectionKey) && (
                                                        <div className="ml-[20px] pl-1 space-y-2 border-l border-white/20">
                                                            {section.items.map(
                                                                (subsection, subsectionIdx) => {
                                                                    const subsectionKey = `${componentIdx}-${sectionIdx}-${subsectionIdx}`;

                                                                    return (
                                                                        <Subsection
                                                                            key={subsectionKey}
                                                                            subsection={subsection}
                                                                            subsectionKey={
                                                                                subsectionKey
                                                                            }
                                                                            isExpanded={expandedSubsections.has(
                                                                                subsectionKey,
                                                                            )}
                                                                            onToggle={() =>
                                                                                toggleSubsection(
                                                                                    subsectionKey,
                                                                                )
                                                                            }
                                                                            pointMarks={
                                                                                marks[componentIdx]?.[
                                                                                    sectionIdx
                                                                                ]?.[subsectionIdx] ?? []
                                                                            }
                                                                            onConfidenceChange={(
                                                                                pointIdx,
                                                                                level,
                                                                            ) =>
                                                                                handleConfidenceChange(
                                                                                    componentIdx,
                                                                                    sectionIdx,
                                                                                    subsectionIdx,
                                                                                    pointIdx,
                                                                                    level,
                                                                                )
                                                                            }
                                                                            isPointVisible={(
                                                                                pointIdx,
                                                                            ) =>
                                                                                isPointVisible(
                                                                                    componentIdx,
                                                                                    sectionIdx,
                                                                                    subsectionIdx,
                                                                                    pointIdx,
                                                                                )
                                                                            }
                                                                        />
                                                                    );
                                                                },
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })
                    )}
                </div>
            </div>
        </div>
    );
}

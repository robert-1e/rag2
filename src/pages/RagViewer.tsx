import { useState } from "react";
import { ArrowLeft, Clock, CheckCircle2 } from "lucide-react";
import { GlassCard } from "../components/ui/GlassCard";
import { Button } from "../components/ui/Button";

// Types
type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

interface SpecPoint {
    id: string;
    text: string;
    confidence: ConfidenceLevel;
}
interface RagDetailPageProps {
    ragId: number;
    ragName: string;
    lastModified: string;
    onBack: () => void;
}

// Mock data for spec points
const initialSpecPoints: SpecPoint[] = [
    {
        id: "1",
        text: "3.1.1 Monomers and polymers",
        confidence: 5,
    },
    {
        id: "2",
        text: "3.1.2 Carbohydrates",
        confidence: 4,
    },
    {
        id: "3",
        text: "3.1.3 Lipids",
        confidence: 4,
    },
    {
        id: "4",
        text: "3.1.4 Proteins",
        confidence: 3,
    },
    {
        id: "5",
        text: "3.1.5 Nucleic acids are important information-carrying molecules",
        confidence: 2,
    },
    {
        id: "6",
        text: "3.1.6 ATP",
        confidence: 5,
    },
    {
        id: "7",
        text: "3.1.7 Water",
        confidence: 5,
    },
    {
        id: "8",
        text: "3.1.8 Inorganic ions",
        confidence: 1,
    },
    {
        id: "9",
        text: "3.2.1 Cell structure",
        confidence: 3,
    },
    {
        id: "10",
        text: "3.2.2 All cells arise from other cells",
        confidence: 2,
    },
];
const confidenceColors = {
    1: {
        bg: "bg-red-500",
        text: "text-red-500",
        border: "border-red-500/50",
        glow: "shadow-red-500/50",
    },
    2: {
        bg: "bg-orange-500",
        text: "text-orange-500",
        border: "border-orange-500/50",
        glow: "shadow-orange-500/50",
    },
    3: {
        bg: "bg-amber-400",
        text: "text-amber-400",
        border: "border-amber-400/50",
        glow: "shadow-amber-400/50",
    },
    4: {
        bg: "bg-lime-400",
        text: "text-lime-400",
        border: "border-lime-400/50",
        glow: "shadow-lime-400/50",
    },
    5: {
        bg: "bg-green-500",
        text: "text-green-500",
        border: "border-green-500/50",
        glow: "shadow-green-500/50",
    },
};

export default function RagViewer({ ragName, lastModified, onBack }: RagDetailPageProps) {
    const [specPoints, setSpecPoints] = useState<SpecPoint[]>(initialSpecPoints);
    const handleConfidenceChange = (pointId: string, level: ConfidenceLevel) => {
        setSpecPoints((prev) =>
            prev.map((p) =>
                p.id === pointId ?
                    {
                        ...p,
                        confidence: level,
                    }
                :   p,
            ),
        );
    };

    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in">
            {/* Header */}
            <div className="mb-8 space-y-6">
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
                    <div className="flex items-center text-slate-400 text-sm font-light">
                        <Clock className="w-4 h-4 mr-2 opacity-70" />
                        <span>Last modified: {lastModified}</span>
                    </div>
                </div>
            </div>

            {/* Spec Points List */}
            <div className="space-y-3 pb-20">
                {specPoints.map((point) => (
                    <GlassCard key={point.id} className="transition-all duration-300">
                        <div className="p-4 md:p-5 flex items-center justify-between gap-6">
                            <span className="text-slate-200 font-medium text-base leading-relaxed flex-1">
                                {point.text}
                            </span>

                            {/* Inline Confidence Selector */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {([1, 2, 3, 4, 5] as ConfidenceLevel[]).map((level) => (
                                    <button
                                        key={level}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleConfidenceChange(point.id, level);
                                        }}
                                        className={`w-7 h-7 rounded-full transition-all duration-300 flex items-center justify-center ${point.confidence === level ? `${confidenceColors[level].bg} scale-110 shadow-lg ${confidenceColors[level].glow} ring-2 ring-white/20` : "bg-slate-800/50 hover:bg-slate-700/70 border border-white/5 hover:scale-105"}`}
                                        aria-label={`Set confidence to level ${level}`}>
                                        {point.confidence === level && (
                                            <CheckCircle2 className="w-4 h-4 text-white/90 drop-shadow-md" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    );
}

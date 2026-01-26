import { Upload, FileText, Calendar, ChevronRight, Sparkles, ExternalLink } from "lucide-react";
import { GlassCard } from "./components/ui/GlassCard";
import { Button } from "./components/ui/Button";

// Mock data for the RAGs (TODO: remove this after done)
const savedRags = [
    {
        id: 1,
        name: "Biology A-Level",
        spec: "AQA",
        date: "January 22nd 2024",
        confidence: "high",
    },
    {
        id: 2,
        name: "Chemistry GCSE",
        spec: "Edexcel",
        date: "March 15th 2024",
        confidence: "medium",
    },
    {
        id: 3,
        name: "Physics A-Level",
        spec: "OCR",
        date: "June 8th 2024",
        confidence: "low",
    },
    {
        id: 4,
        name: "History: The Cold War",
        spec: "AQA",
        date: "July 12th 2024",
        confidence: "high",
    },
];

// Very hacky approach, sadly I couldn't find something better
// Create a hidden file input for the file picker function
const hiddenInp = document.createElement("input");
{
    hiddenInp.id = "ragSelector"; // Not sure if this does anything tbh
    hiddenInp.type = "file";
    hiddenInp.multiple = true;
    hiddenInp.accept = ".json, .cms";

    hiddenInp.onchange = (e: Event) => {
        let files = (e.target as HTMLInputElement)?.files;
        if (!files?.length) return;

        console.log("Selected file:", files[0].name);

        // Process the file using FileReader or FormData
    };
}

async function openRagFilePicker(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    console.log("openRagFilePicker ran");

    try {
        // TODO: do something with this
        throw Error("If you see this error, remind me to implement this thing");

        //@ts-expect-error  This function is only supported on HTTPS && some specific browsers
        //          https://developer.mozilla.org/en-US/docs/Web/API/Window/showOpenFilePicker
        let fileHandles = await window.showOpenFilePicker({
            id: "ragSelector",
            multiple: true,
            types: [
                {
                    description: "old type, specific for 1 spec and outdated",
                    accept: {
                        "application/json": [".cms"],
                    },
                },
                {
                    accept: {
                        "application/json": [".json"],
                    },
                },
            ],
        });
    } catch (err) {
        console.error(err); // because why not, idk (SHUSH)

        // This will happen alot
        hiddenInp.click();
    }
}

export function App() {
    return (
        <div className="min-h-screen w-full bg-[#0f172a] relative overflow-x-hidden selection:bg-indigo-500/30">
            {/* Background Ambient Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-slate-800/50 blur-[100px]" />
            </div>

            <main className="relative z-10 max-w-4xl mx-auto px-6 py-20 flex flex-col items-center">
                {/* Header Section */}
                <div className="text-center mb-16 space-y-4 animate-fade-in-up">
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

                {/* Import Action */}
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
                <div className="w-full space-y-6">
                    <div className="flex items-center justify-between px-2 mb-2">
                        <h2 className="text-xl font-serif text-white/90">
                            Choose from localstorage
                        </h2>
                        <span className="text-xs text-slate-500 uppercase tracking-widest font-medium">
                            Saved Rags
                        </span>
                    </div>

                    <div className="space-y-4">
                        {savedRags.map((rag, index) => (
                            <GlassCard
                                key={rag.id}
                                hoverEffect={true}
                                className="group flex items-center justify-between p-5 md:p-6 animate-fade-in">
                                <div className="flex items-center space-x-4 md:space-x-6">
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br border border-white/10 shadow-inner ${
                        rag.confidence === "high" ?
                            "from-emerald-500/20 to-emerald-900/20 text-emerald-400"
                        : rag.confidence === "medium" ?
                            "from-amber-500/20 to-amber-900/20 text-amber-400"
                        :   "from-rose-500/20 to-rose-900/20 text-rose-400"
                    }`}>
                                        <FileText className="w-5 h-5" />
                                    </div>

                                    <div className="flex flex-col">
                                        <h3 className="text-lg font-medium text-white group-hover:text-indigo-300 transition-colors">
                                            {rag.name}
                                        </h3>
                                        <div className="flex items-center space-x-3 text-sm text-slate-400 mt-1">
                                            <span className="bg-white/5 px-2 py-0.5 rounded text-xs border border-white/5">
                                                {rag.spec}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span className="flex items-center">
                                                <Calendar className="w-3 h-3 mr-1.5 opacity-70" />
                                                {rag.date}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center text-slate-500 group-hover:text-white transition-colors duration-300">
                                    <ChevronRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <footer className="mt-20 text-center text-slate-600 text-sm font-light">
                    <p>
                        &copy; {new Date().getFullYear()} CMS-DB Enhanced. Designed for excellence.
                    </p>
                </footer>
            </main>
        </div>
    );
}

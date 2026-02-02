import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";

import Dashboard from "./pages/Dashboard.tsx";
import Home from "./pages/Home.tsx";
import RagViewer from "./pages/RagViewer.tsx";

function RagViewerRoute() {
    const { ragName } = useParams<{ ragName: string }>();
    const navigate = useNavigate();

    if (!ragName) {
        navigate("/dashboard");
        return null;
    }

    return (
        <RagViewer
            ragName={decodeURIComponent(ragName)}
            onBack={() => navigate("/dashboard")}
        />
    );
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/rag/:ragName" element={<RagViewerRoute />} />
        </Routes>
    );
}

export function App() {
    // temporary

    return (
        <div className="min-h-screen w-full bg-[#0f172a] relative overflow-x-hidden selection:bg-indigo-500/30">
            {/* Background Ambient Effects */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-600/20 blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px]" />
                <div className="absolute top-[40%] left-[50%] transform -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] rounded-full bg-slate-800/50 blur-[100px]" />
            </div>

            <main className="relative z-10 mx-auto p-6 flex flex-col items-center">
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>
            </main>
            {/* Footer */}
            <footer className="my-10 text-center text-slate-600 text-sm font-light">
                <p>&copy; {new Date().getFullYear()} rag2</p>
            </footer>
        </div>
    );
}

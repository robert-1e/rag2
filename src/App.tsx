import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard.tsx";
import Home from "./pages/Home.tsx";
import RagViewer from "./pages/RagViewer.tsx";

function AppRoutes() {
    const selectedRag = { id: 0, name: "Name", date: "Yesterday" };

    const navigate = useNavigate();

    return (
        <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route
                path="/rag/*"
                element={
                    <RagViewer
                        ragId={selectedRag.id}
                        ragName={selectedRag.name}
                        lastModified={selectedRag.date}
                        onBack={() => navigate("/")}
                    />
                }
            />
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

            <main className="relative z-10 max-w-4xl mx-auto p-6 flex flex-col items-center">
                <BrowserRouter>
                    <AppRoutes />
                </BrowserRouter>

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

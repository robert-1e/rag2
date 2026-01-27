import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard.tsx";
import Home from "./pages/Home.tsx";
import RagViewer from "./pages/RagViewer.tsx";

export function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/rag/*" element={<RagViewer />} />
            </Routes>
        </BrowserRouter>
    );
}

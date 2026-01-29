import Dashboard from "./Dashboard.tsx";

export default function Home() {
    history.pushState(0, "", "/dashboard");

    return (
        <>
            <Dashboard />
        </>
    );
}

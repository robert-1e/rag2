import Dashboard from "./Dashboard.tsx";

export default function Home() {
    history.pushState({}, "", "/dashboard");

    return (
        <>
            <Dashboard />
        </>
    );
}

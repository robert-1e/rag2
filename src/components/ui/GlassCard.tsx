import React from "react";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hoverEffect?: boolean;
    onClick?: () => void;
}

export function GlassCard({
    children,
    className = "",
    hoverEffect = false,
    onClick,
}: GlassCardProps) {
    return (
        <div
            onClick={onClick}
            className={`
        relative overflow-hidden
        bg-white/5 backdrop-blur-md 
        border border-white/10 
        shadow-xl rounded-2xl
        transition-all duration-300 ease-out
        ${hoverEffect ? "hover:-translate-y-1 hover:shadow-2xl hover:bg-white/10 hover:border-white/20 cursor-pointer" : ""}
        ${className}
      `}>
            {/* Subtle noise texture or gradient overlay could go here if needed, keeping it clean for now */}
            <div className="relative z-10">{children}</div>
        </div>
    );
}

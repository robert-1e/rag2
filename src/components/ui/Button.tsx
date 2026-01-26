import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "primary" | "glass" | "ghost";
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export function Button({
    children,
    variant = "primary",
    isLoading,
    icon,
    className = "",
    ...props
}: ButtonProps) {
    const baseStyles =
        "relative inline-flex items-center justify-center px-6 py-3 text-sm font-medium transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
        primary:
            "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] border border-transparent",
        glass: "bg-white/10 text-white border border-white/20 hover:bg-white/20 hover:border-white/30 backdrop-blur-sm shadow-lg shadow-black/5",
        ghost: "bg-transparent text-slate-300 hover:text-white hover:bg-white/5",
    };
    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${className}`}
            disabled={isLoading}
            {...props}>
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {!isLoading && icon && <span className="mr-2">{icon}</span>}
            {children}
        </button>
    );
}

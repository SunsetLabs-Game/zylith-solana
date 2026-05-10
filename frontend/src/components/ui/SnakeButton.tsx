import { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Link } from "react-router";

interface SnakeButtonProps {
    children: ReactNode;
    className?: string;
    href?: string;
    to?: string;
    onClick?: () => void;
    primary?: boolean;
}

export function SnakeButton({
    children,
    className,
    href,
    to,
    onClick,
    primary = false,
}: SnakeButtonProps) {
    const Component = to ? Link : href ? "a" : "button";

    const containerClasses = cn(
        "relative inline-flex overflow-hidden rounded-2xl p-[1px] group active:scale-95 transition-all duration-300",
        primary ? "shadow-[0_10px_40px_rgba(20,241,149,0.15)] hover:shadow-[0_14px_60px_rgba(20,241,149,0.25)]" : "",
        className
    );

    const props: any = {
        className: containerClasses,
        ...(to ? { to } : {}),
        ...(href ? { href, target: "_blank", rel: "noopener noreferrer" } : {}),
        ...(onClick ? { onClick } : {}),
    };

    return (
        <Component {...props}>
            {/* Spinning snake light wrapper */}
            <span className={cn(
                "absolute inset-[-1000%] animate-[spin_3s_linear_infinite] opacity-0 transition-opacity duration-700 group-hover:opacity-100",
                primary
                    ? "bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,var(--color-primary)_100%)]"
                    : "bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,transparent_75%,var(--color-accent)_100%)]"
            )} />

            {/* Static border (when not hovering) */}
            <span className={cn(
                "absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none border border-white/10",
                primary ? "bg-primary/5" : "bg-accent/5",
                "group-hover:opacity-0"
            )} />

            {/* Inner button surface */}
            <span className={cn(
                "relative z-10 w-full h-full inline-flex items-center justify-center rounded-[15px] px-10 py-5 text-sm font-heading tracking-[0.2em] uppercase transition-all duration-500",
                primary
                    ? "bg-primary text-background group-hover:bg-primary/90"
                    : "bg-secondary/90 text-foreground group-hover:bg-secondary"
            )}>
                <span className="pt-0.5">{children}</span>
            </span>
        </Component>
    );
}

import { HTMLMotionProps, motion, useMotionTemplate, useMotionValue } from "motion/react";
import React from "react";
import clsx from "clsx";

interface GlowingCardProps extends HTMLMotionProps<"div"> {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}

export function GlowingCard({ children, className, glowColor = "rgba(20, 241, 149, 0.15)", ...props }: GlowingCardProps) {
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    function handleMouseMove({
        currentTarget,
        clientX,
        clientY,
    }: React.MouseEvent<HTMLDivElement>) {
        const { left, top } = currentTarget.getBoundingClientRect();
        mouseX.set(clientX - left);
        mouseY.set(clientY - top);
    }

    return (
        <motion.div
            className={clsx(
                "group relative flex flex-col rounded-3xl border border-white/5 bg-card/40 backdrop-blur-3xl overflow-hidden transition-all duration-500 hover:border-white/10 shadow-2xl",
                className
            )}
            onMouseMove={handleMouseMove}
            whileHover={{ y: -4, scale: 1.005 }}
            transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
            {...props}
        >
            {/* Interactive hover glow bounded to the card */}
            <motion.div
                className="pointer-events-none absolute -inset-px rounded-3xl opacity-0 transition duration-500 group-hover:opacity-100 z-0"
                style={{
                    background: useMotionTemplate`
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              ${glowColor},
              transparent 80%
            )
          `,
                }}
            />

            {/* Content wrapper */}
            <div className="relative z-10 flex h-full flex-col p-10">
                {children}
            </div>
        </motion.div>
    );
}

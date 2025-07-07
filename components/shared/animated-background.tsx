"use client"

import { Sparkles, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface AnimatedBackgroundProps {
  variant?: "default" | "video" | "minimal"
  className?: string
  children?: React.ReactNode
}

export function AnimatedBackground({ 
  variant = "default", 
  className,
  children 
}: AnimatedBackgroundProps) {
  return (
    <div className={cn("relative min-h-screen overflow-hidden", className)}>
      {/* Video Background (only for video variant) */}
      {variant === "video" && (
        <video 
          autoPlay 
          muted 
          loop 
          playsInline 
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/ff-fly-away.mp4" type="video/mp4" />
        </video>
      )}

      {/* Gradient Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gradient-purple/20 via-gradient-pink/20 to-gradient-blue/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(168,85,247,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(236,72,153,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(59,130,246,0.15),transparent_50%)]" />
      </div>

      {/* Floating Elements - Only show on larger screens to avoid clutter */}
      {variant !== "minimal" && (
        <>
          {/* Primary floating elements */}
          <div className="absolute top-20 left-20 animate-float z-10 hidden sm:block">
            <Sparkles className="w-8 h-8 text-gradient-purple opacity-60" />
          </div>
          <div className="absolute bottom-32 right-32 animate-float-delayed z-10 hidden sm:block">
            <Zap className="w-6 h-6 text-gradient-pink opacity-60" />
          </div>
          <div className="absolute top-40 right-20 animate-float-slow z-10 hidden lg:block">
            <Sparkles className="w-6 h-6 text-gradient-blue opacity-50" />
          </div>
          <div className="absolute bottom-20 left-32 animate-float-fast z-10 hidden lg:block">
            <Zap className="w-8 h-8 text-gradient-indigo opacity-40" />
          </div>

          {/* Secondary floating elements - Only on large screens */}
          <div className="absolute top-60 left-1/4 animate-float-delayed z-10 hidden lg:block">
            <Sparkles className="w-7 h-7 text-gradient-pink opacity-55" />
          </div>
          <div className="absolute bottom-40 right-1/4 animate-float z-10 hidden lg:block">
            <Zap className="w-5 h-5 text-gradient-cyan opacity-65" />
          </div>
          <div className="absolute top-32 right-1/3 animate-float-slow z-10 hidden xl:block">
            <Sparkles className="w-5 h-5 text-gradient-indigo opacity-45" />
          </div>
          <div className="absolute bottom-60 left-1/3 animate-float-fast z-10 hidden xl:block">
            <Zap className="w-7 h-7 text-gradient-rose opacity-50" />
          </div>

          {/* Mobile-optimized floating elements */}
          <div className="absolute top-16 right-8 animate-float z-10 sm:hidden">
            <Sparkles className="w-5 h-5 text-gradient-purple opacity-50" />
          </div>
          <div className="absolute bottom-24 left-8 animate-float-delayed z-10 sm:hidden">
            <Zap className="w-4 h-4 text-gradient-pink opacity-60" />
          </div>
        </>
      )}

      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  )
}
"use client"

import { motion, useReducedMotion } from "framer-motion"
import type React from "react"
import { useId, useState } from "react"
import { useTheme } from "next-themes"
import { HyperText } from "@/src/components/ui/hyper-text"

interface HudButtonProps {
  children: React.ReactNode
  variant?: "primary" | "secondary"
  style?: "style1" | "style2"
  size?: "small" | "default" | "large"
  onClick?: () => void
  delay?: number
  enableAnimations?: boolean
  className?: string
  disabled?: boolean
}

export function HudButton({ 
  children, 
  variant = "primary", 
  style = "style1",
  size = "default",
  onClick, 
  delay = 0,
  enableAnimations = true,
  className = "",
  disabled = false
}: HudButtonProps) {
  const shouldReduceMotion = useReducedMotion()
  const shouldAnimate = enableAnimations && !shouldReduceMotion
  const [isHovered, setIsHovered] = useState(false)
  
  let isDark = true
  try {
    const themeContext = useTheme()
    isDark = themeContext ? themeContext.theme !== "light" : true
  } catch (e) {
    isDark = true
  }

  // Theme-aware color system
  const getColors = () => {
    if (disabled) {
      return {
        main: "#4b5563",
        gradient: "#374151",
        text: "text-zinc-500",
        glow: "rgba(0, 0, 0, 0)",
        border: "#4b5563"
      }
    }
    if (variant === "primary") {
      return {
        main: isDark ? "#10b981" : "#059669", // emerald-500 or emerald-600
        gradient: isDark ? "#10b981" : "#059669",
        text: isDark ? "text-emerald-300" : "text-emerald-700",
        glow: isDark ? "rgba(16, 185, 129, 0.3)" : "rgba(5, 150, 105, 0.2)",
        border: isDark ? "#10b981" : "#059669"
      }
    } else {
      return {
        main: isDark ? "#64748b" : "#374151", // Keep dark slate, darker for light
        gradient: isDark ? "#64748b" : "#374151", 
        text: isDark ? "text-slate-300" : "text-gray-600",
        glow: isDark ? "rgba(100, 116, 139, 0.2)" : "rgba(55, 65, 81, 0.1)",
        border: isDark ? "#64748b" : "#374151"
      }
    }
  }

  const colors = getColors()

  const buttonVariants = {
    hidden: {
      opacity: 0,
      y: 20,
      scale: 0.95,
      filter: shouldAnimate ? "blur(4px)" : "blur(0px)",
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 25,
        mass: 0.8,
        delay,
        duration: shouldAnimate ? undefined : 0,
      },
    },
  }

  const containerVariants = {
    hover: {
      scale: disabled ? 1 : 1.02,
      y: disabled ? 0 : -2,
      rotateX: disabled ? 0 : 2,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        mass: 0.6,
      },
    },
    tap: {
      scale: disabled ? 1 : 0.98,
      y: 0,
      rotateX: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 30,
        mass: 0.5,
      },
    },
  }

  const glowVariants = {
    initial: {
      opacity: 0,
      scale: 0.8,
    },
    hover: {
      opacity: disabled ? 0 : (variant === "primary" ? (isDark ? 0.6 : 0.4) : (isDark ? 0.3 : 0.2)),
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20,
      },
    },
  }

  const dotVariants = {
    hidden: { 
      scale: 0, 
      opacity: 0,
      filter: "blur(2px)"
    },
    show: (i: number) => ({
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: delay + 0.3 + (i * 0.05),
        duration: shouldAnimate ? undefined : 0,
      },
    }),
    hover: {
      scale: disabled ? 1 : 1.2,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 25,
        mass: 0.4,
      },
    },
  }

  const shimmerVariants = {
    initial: {
      x: "-100%",
      opacity: 0,
    },
    animate: {
      x: "100%",
      opacity: [0, 0.5, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatDelay: 3,
        ease: "easeInOut",
      },
    },
  }

  const uniqueId = useId()
  const gradientId1 = `gradient1-${uniqueId}`
  const gradientId2 = `gradient2-${uniqueId}`
  const gradientId = `gradient-${uniqueId}`

  const getSizeStyles = () => {
    if (style === "style1") {
      return {
        width: "100%",
        height: "100%",
        textClass: "text-xs tracking-wider font-bold"
      }
    }
    
    switch (size) {
      case "small":
        return {
          width: "100%",
          height: "39px",
          textClass: "text-xs tracking-wide font-bold"
        }
      case "large":
        return {
          width: "100%",
          height: "65px",
          textClass: "text-base tracking-wider font-bold"
        }
      default:
        return {
          width: "100%",
          height: "52px",
          textClass: "text-sm tracking-wider font-bold"
        }
    }
  }

  const sizeStyles = getSizeStyles()

  const renderStyle1SVG = () => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="100%"
      height="100%"
      viewBox="0 0 182 44"
      preserveAspectRatio="none"
      className="w-full h-full"
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="50%"
          y1="0%"
          x2="50%"
          y2="100%"
        >
          <stop offset="0" stopColor={colors.gradient} />
          <stop offset="0.005" stopColor={colors.gradient} stopOpacity="0.986" />
          <stop offset="0.085" stopColor={colors.gradient} stopOpacity="0.781" />
          <stop offset="0.17" stopColor={colors.gradient} stopOpacity="0.596" />
          <stop offset="0.258" stopColor={colors.gradient} stopOpacity="0.436" />
          <stop offset="0.351" stopColor={colors.gradient} stopOpacity="0.301" />
          <stop offset="0.449" stopColor={colors.gradient} stopOpacity="0.191" />
          <stop offset="0.554" stopColor={colors.gradient} stopOpacity="0.106" />
          <stop offset="0.669" stopColor={colors.gradient} stopOpacity="0.046" />
          <stop offset="0.804" stopColor={colors.gradient} stopOpacity="0.011" />
          <stop offset="1" stopColor={colors.gradient} stopOpacity="0" />
        </linearGradient>
      </defs>
      <g>
        <g>
          <motion.path 
            d="M 181.5 0.5 L 13.7 0.5 L 4.6 9.6 L 4.6 43.2 L 170 43.2 L 181.5 31.5 Z" 
            fill={`url(#${gradientId})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: shouldAnimate ? 0.8 : 0, 
              delay: delay + 0.2,
              ease: "easeOut" 
            }}
          />
          <motion.path
            d="M 170 43.5 L 4.1 43.5 L 4.1 9.4 L 13.5 0.5 L 181.5 0.5 L 181.5 31.7 Z M 5 42.5 L 169.5 42.5 L 180.5 31 L 180.5 1.5 L 13.9 1.5 L 5 10.3 Z"
            fill={colors.border}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: shouldAnimate ? 0.6 : 0, 
              delay: delay + 0.4,
              ease: "easeOut" 
            }}
          />
          <g>
            {[
              { cx: "169.9", cy: "7.3", index: 0 },
              { cx: "169.9", cy: "11.9", index: 1 },
              { cx: "174.4", cy: "7.3", index: 2 },
              { cx: "174.4", cy: "11.9", index: 3 },
            ].map((dot) => (
              <motion.circle
                key={`${dot.cx}-${dot.cy}`}
                cx={dot.cx}
                cy={dot.cy}
                r="1.1"
                fill={colors.main}
                variants={dotVariants}
                initial="hidden"
                animate="show"
                whileHover="hover"
                custom={dot.index}
              />
            ))}
          </g>
        </g>
        <g>
          {[
            { cx: "0.6", cy: "19.2", index: 4 },
            { cx: "0.6", cy: "24.5", index: 5 },
          ].map((dot) => (
            <motion.circle
              key={`${dot.cx}-${dot.cy}`}
              cx={dot.cx}
              cy={dot.cy}
              r="0.6"
              fill={colors.main}
              variants={dotVariants}
              initial="hidden"
              animate="show"
              whileHover="hover"
              custom={dot.index}
            />
          ))}
        </g>
      </g>
    </svg>
  )

  const renderStyle2SVG = () => (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 187 52"
      preserveAspectRatio="none"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
    >
      <defs>
        <linearGradient id={gradientId1} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.95" />
          <stop offset="0.005" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.92" />
          <stop offset="0.085" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.85" />
          <stop offset="0.17" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.75" />
          <stop offset="0.258" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.65" />
          <stop offset="0.351" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.55" />
          <stop offset="0.449" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.45" />
          <stop offset="0.554" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.35" />
          <stop offset="0.669" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.25" />
          <stop offset="0.804" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0.15" />
          <stop offset="1" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#1a1a1a" : "#f8f9fa")} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gradientId2} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.8" />
          <stop offset="0.005" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.75" />
          <stop offset="0.085" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.65" />
          <stop offset="0.17" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.55" />
          <stop offset="0.258" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.45" />
          <stop offset="0.351" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.35" />
          <stop offset="0.449" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.25" />
          <stop offset="0.554" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.18" />
          <stop offset="0.669" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.12" />
          <stop offset="0.804" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0.06" />
          <stop offset="1" stopColor={variant === "primary" ? colors.gradient : (isDark ? "#2a2a2a" : "#e5e7eb")} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Corner dots - top right */}
      {[
        { cx: "174.1", cy: "7.1", index: 0 },
        { cx: "174.1", cy: "11.7", index: 1 },
        { cx: "178.6", cy: "7.1", index: 2 },
        { cx: "178.6", cy: "11.7", index: 3 },
      ].map((dot) => (
        <motion.circle
          key={`${dot.cx}-${dot.cy}`}
          cx={dot.cx}
          cy={dot.cy}
          r="1.1"
          fill={variant === "primary" ? colors.main : (isDark ? "#EFEFEF" : "#374151")}
          variants={dotVariants}
          initial="hidden"
          animate="show"
          whileHover="hover"
          custom={dot.index}
        />
      ))}
      
      {/* Main button shape */}
      <motion.path 
        d="M 4.5 6 L 10 0.5 L 181 0.5 L 186.5 6 L 186.5 46 L 181 51.5 L 10 51.5 L 4.5 45.7 L 4.5 6" 
        fill={`url(#${gradientId1})`} 
        stroke={variant === "primary" ? colors.border : (isDark ? "rgba(255,255,255,0.4)" : "#374151")} 
        strokeWidth="1"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ 
          duration: shouldAnimate ? 0.8 : 0, 
          delay: delay + 0.2,
          ease: "easeOut" 
            }}
          />
          
          {/* Side dots - left */}
          {[
            { cx: "0.6", cy: "23.6", index: 4 },
            { cx: "0.6", cy: "28.9", index: 5 },
          ].map((dot) => (
            <motion.circle
              key={`${dot.cx}-${dot.cy}`}
              cx={dot.cx}
              cy={dot.cy}
              r="0.6"
              fill={variant === "primary" ? colors.main : (isDark ? "#EFEFEF" : "#374151")}
              variants={dotVariants}
              initial="hidden"
              animate="show"
              whileHover="hover"
              custom={dot.index}
            />
          ))}
          
          {/* Border outline */}
          <motion.path 
            d="M 181 52 L 10 52 L 4 46.1 L 4 5.9 L 10 0 L 181 0 L 187 5.9 L 187 46.1 Z M 10.1 51.5 L 180.8 51.5 L 186.5 45.9 L 186.5 6.1 L 180.8 0.4 L 10 0.5 L 4.5 6 L 4.4 45.9 Z" 
            fill={isDark ? "rgba(255,255,255,0.2)" : "#374151"}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: shouldAnimate ? 0.6 : 0, 
              delay: delay + 0.4,
              ease: "easeOut" 
            }}
          />
          <motion.path 
            d="M 181 52 L 10 52 L 4 46.1 L 4 5.9 L 10 0 L 181 0 L 187 5.9 L 187 46.1 Z" 
            fill={`url(#${gradientId2})`}
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ 
              duration: shouldAnimate ? 0.6 : 0, 
              delay: delay + 0.5,
              ease: "easeOut" 
            }}
          />
        </svg>
      )

      return (
        <motion.button
          className={`relative transform-gpu ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${className}`}
          variants={shouldAnimate ? buttonVariants : {}}
          initial={shouldAnimate ? "hidden" : "show"}
          animate="show"
          whileHover={disabled ? undefined : "hover"}
          whileTap={disabled ? undefined : "tap"}
          onClick={disabled ? undefined : onClick}
          onHoverStart={() => !disabled && setIsHovered(true)}
          onHoverEnd={() => !disabled && setIsHovered(false)}
          disabled={disabled}
          style={{ 
            width: "100%", 
            height: "100%",
            perspective: "1000px"
          }}
        >
          {/* Background glow effect */}
          {!disabled && (
            <motion.div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
                filter: "blur(10px)",
              }}
              variants={shouldAnimate ? glowVariants : {}}
              initial="initial"
              animate={isHovered ? "hover" : "initial"}
            />
          )}

          {/* Shimmer effect */}
          {shouldAnimate && variant === "primary" && !disabled && (
            <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
              <motion.div
                className="absolute inset-0"
                style={{
                  background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                  width: "30%",
                  height: "100%",
                }}
                variants={shimmerVariants}
                initial="initial"
                animate="animate"
              />
            </div>
          )}

          <motion.div 
            variants={shouldAnimate ? containerVariants : {}}
            className="relative h-full w-full flex items-center justify-center"
            style={{ transformStyle: "preserve-3d" }}
          >
            <div className="absolute inset-0 w-full h-full">
              {style === "style1" ? renderStyle1SVG() : renderStyle2SVG()}
            </div>

            {/* Text overlay */}
            <div className="absolute inset-0 flex items-center justify-center p-2 select-none">
              <motion.div
                className="w-full flex justify-center text-center items-center"
                initial={{ opacity: 0, y: 5 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  transition: { 
                    delay: delay + 0.6,
                    duration: shouldAnimate ? 0.4 : 0,
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }
                }}
              >
                {typeof children === "string" ? (
                  <HyperText
                    text={children}
                    className={`cursor-pointer ${sizeStyles.textClass} ${colors.text} text-center`}
                    duration={shouldAnimate ? 800 : 0}
                    animateOnLoad={shouldAnimate}
                  />
                ) : (
                  <div className={`flex items-center justify-center gap-1.5 ${sizeStyles.textClass} ${colors.text}`}>
                    {children}
                  </div>
                )}
              </motion.div>
            </div>
          </motion.div>
        </motion.button>
      )
    }

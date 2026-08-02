import { ArrowRight } from "lucide-react"
import {
  useState,
  Suspense,
  lazy,
  type ReactNode,
  type CSSProperties,
} from "react"

const Dithering = lazy(() =>
  import("@paper-design/shaders-react").then((mod) => ({ default: mod.Dithering }))
)

/** Soft burnt orange — copper dither field */
export const ORANGE_SOFT = "#C46A3A"
export const ORANGE_MUTED = "#A85A32"
export const COPPER_BACK = "#140c08"
export const COPPER_FRONT = "#B56A3C"

type WaveProps = {
  className?: string
  style?: CSSProperties
  interactive?: boolean
  boosted?: boolean
}

/** Full-bleed moving wave + ripple dithering layers (copper topographic look) */
export function DitheringWaves({
  className = "",
  style,
  interactive = true,
  boosted = false,
}: WaveProps) {
  const [isHovered, setIsHovered] = useState(false)
  const active = boosted || isHovered

  return (
    <div
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: COPPER_BACK, ...style }}
      onMouseEnter={interactive ? () => setIsHovered(true) : undefined}
      onMouseLeave={interactive ? () => setIsHovered(false) : undefined}
      aria-hidden="true"
    >
      <Suspense fallback={<div className="absolute inset-0" style={{ background: COPPER_BACK }} />}>
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.85]">
          <Dithering
            colorBack={COPPER_BACK}
            colorFront={COPPER_FRONT}
            shape="wave"
            type="4x4"
            size={2.5}
            scale={1.2}
            speed={active ? 1.05 : 0.5}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
        <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.35]">
          <Dithering
            colorBack="#00000000"
            colorFront={ORANGE_MUTED}
            shape="warp"
            type="8x8"
            size={3.5}
            scale={0.9}
            speed={active ? 0.65 : 0.32}
            className="size-full"
            minPixelRatio={1}
          />
        </div>
      </Suspense>
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 70% 50%, rgba(0,0,0,0.45), transparent 55%), linear-gradient(90deg, transparent 40%, rgba(0,0,0,0.55) 100%)",
          animation: "hero-wave-drift 9s ease-in-out infinite alternate",
        }}
      />
      <style>{`
        @keyframes hero-wave-drift {
          0% { opacity: 0.85; }
          100% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export type CTASectionProps = {
  badge?: string
  title?: ReactNode
  description?: string
  ctaLabel?: string
  onCtaClick?: () => void
  /** When set, replaces the default marketing CTA body (e.g. login form) */
  children?: ReactNode
  className?: string
  minHeightClassName?: string
}

export function CTASection({
  badge = "AI-Powered Writing",
  title = (
    <>
      Your words, <br />
      <span className="text-white/80">delivered perfectly.</span>
    </>
  ),
  description = "Join 2,847 founders using the only AI that understands the nuance of your voice. Clean, precise, and uniquely yours.",
  ctaLabel = "Start Typing",
  onCtaClick,
  children,
  className = "",
  minHeightClassName = "min-h-[600px] md:min-h-[600px]",
}: CTASectionProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className={`py-8 md:py-12 w-full flex justify-center items-center px-4 md:px-6 ${className}`}>
      <div
        className="w-full max-w-7xl relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          className={`relative overflow-hidden rounded-[32px] md:rounded-[48px] border border-white/10 bg-black shadow-sm ${minHeightClassName} flex flex-col items-center justify-center duration-500`}
        >
          <DitheringWaves interactive={false} boosted={isHovered} />
          <div
            className="absolute inset-0 z-0 pointer-events-none transition-opacity duration-500"
            style={{ opacity: isHovered ? 0.12 : 0, background: ORANGE_MUTED, mixBlendMode: "screen" }}
          />

          {children ? (
            <div className="relative z-10 w-full px-4 py-8 md:px-10 md:py-12">{children}</div>
          ) : (
            <div className="relative z-10 px-6 max-w-4xl mx-auto text-center flex flex-col items-center">
              <div
                className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm"
                style={{
                  borderColor: "rgba(196, 106, 58, 0.22)",
                  background: "rgba(196, 106, 58, 0.08)",
                  color: ORANGE_SOFT,
                }}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
                    style={{ background: ORANGE_SOFT }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: ORANGE_SOFT }}
                  />
                </span>
                {badge}
              </div>

              <h2 className="font-serif text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-white mb-8 leading-[1.05]">
                {title}
              </h2>

              <p className="text-white/60 text-lg md:text-xl max-w-2xl mb-12 leading-relaxed">
                {description}
              </p>

              <button
                type="button"
                onClick={onCtaClick}
                className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full px-12 text-base font-medium text-white transition-all duration-300 hover:scale-105 active:scale-95"
                style={{
                  background: ORANGE_MUTED,
                  boxShadow: isHovered ? "0 0 0 4px rgba(196, 106, 58, 0.18)" : "none",
                }}
              >
                <span className="relative z-10">{ctaLabel}</span>
                <ArrowRight className="h-5 w-5 relative z-10 transition-transform duration-300 group-hover:translate-x-1" />
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

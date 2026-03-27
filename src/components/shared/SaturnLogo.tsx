// Shared Saturn planet logo — indigo/purple color scheme
export function SaturnLogo({ width = 34, height = 28 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 36 30" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ring — back arc (top half, drawn behind planet) */}
      <ellipse cx="18" cy="18" rx="17" ry="5"
        stroke="#6366F1" strokeWidth="1.6" fill="none" opacity="0.45"
        strokeDasharray="37.2 37.2" strokeDashoffset="-37.2"
      />
      {/* Planet body */}
      <circle cx="18" cy="13" r="9" fill="#0D1117" stroke="#6366F1" strokeWidth="1.4"/>
      <circle cx="18" cy="13" r="9" fill="url(#satGradShared)"/>
      {/* Ring — front arc (bottom half, over planet) */}
      <ellipse cx="18" cy="18" rx="17" ry="5"
        stroke="#6366F1" strokeWidth="1.6" fill="none"
        strokeDasharray="37.2 37.2" strokeDashoffset="0"
      />
      {/* 4-pointed sparkle stars */}
      <path d="M4,2 L4.5,3.5 L6,4 L4.5,4.5 L4,6 L3.5,4.5 L2,4 L3.5,3.5Z" fill="#818CF8"/>
      <path d="M32,2 L32.4,3.1 L33.5,3.5 L32.4,3.9 L32,5 L31.6,3.9 L30.5,3.5 L31.6,3.1Z" fill="#A855F7" opacity="0.9"/>
      <path d="M33,23 L33.3,23.9 L34.2,24.2 L33.3,24.5 L33,25.4 L32.7,24.5 L31.8,24.2 L32.7,23.9Z" fill="#818CF8" opacity="0.75"/>
      <path d="M2,22.5 L2.25,23.25 L3,23.5 L2.25,23.75 L2,24.5 L1.75,23.75 L1,23.5 L1.75,23.25Z" fill="#A855F7" opacity="0.6"/>
      <defs>
        <radialGradient id="satGradShared" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#4338CA" stopOpacity="0.4"/>
        </radialGradient>
      </defs>
    </svg>
  )
}

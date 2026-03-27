// Saturn planet logo — bold filled planet with rings and sparkle stars
export function SaturnLogo({ width = 40, height = 30 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ring — back arc (behind planet) */}
      <ellipse cx="24" cy="24" rx="22" ry="6"
        stroke="#818CF8" strokeWidth="2" fill="none" opacity="0.38"
        strokeDasharray="50.7 50.7" strokeDashoffset="-50.7"
      />
      {/* Planet body */}
      <circle cx="24" cy="17" r="13" fill="#0D1117" stroke="#6366F1" strokeWidth="1.4"/>
      <circle cx="24" cy="17" r="13" fill="url(#satGradShared)"/>
      {/* Ring — front arc (over planet) */}
      <ellipse cx="24" cy="24" rx="22" ry="6"
        stroke="#818CF8" strokeWidth="2" fill="none"
        strokeDasharray="50.7 50.7" strokeDashoffset="0"
      />
      {/* 4-pointed sparkle stars */}
      <path d="M4,1 L5.2,4.8 L9,6 L5.2,7.2 L4,11 L2.8,7.2 L-1,6 L2.8,4.8Z" fill="#818CF8"/>
      <path d="M43,1 L44,3.8 L46.8,4.8 L44,5.8 L43,8.6 L42,5.8 L39.2,4.8 L42,3.8Z" fill="#A855F7" opacity="0.9"/>
      <path d="M44,28 L44.7,30.3 L47,31 L44.7,31.7 L44,34 L43.3,31.7 L41,31 L43.3,30.3Z" fill="#818CF8" opacity="0.72"/>
      <path d="M3,28 L3.6,29.9 L5.5,30.5 L3.6,31.1 L3,33 L2.4,31.1 L0.5,30.5 L2.4,29.9Z" fill="#A855F7" opacity="0.55"/>
      <defs>
        <radialGradient id="satGradShared" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#818CF8" stopOpacity="0.88"/>
          <stop offset="100%" stopColor="#4338CA" stopOpacity="0.62"/>
        </radialGradient>
      </defs>
    </svg>
  )
}

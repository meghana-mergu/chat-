export default function Man({ walking, idle }) {
  return (
    <svg viewBox="0 0 110 200" width={110} height={200}>
      <g className={idle ? 'idle-sway' : ''}>
        {/* Left leg */}
        <g className={walking ? 'leg-l' : ''} style={{ transformOrigin: '42px 130px' }}>
          <rect x={34} y={130} width={16} height={52} rx={8} fill="#2d2d3a" />
          <ellipse cx={40} cy={183} rx={11} ry={6} fill="#f0f0f0" />
          <rect x={30} y={179} width={20} height={8} rx={4} fill="#e8e8e8" />
        </g>
        {/* Right leg */}
        <g className={walking ? 'leg-r' : ''} style={{ transformOrigin: '62px 130px' }}>
          <rect x={58} y={130} width={16} height={52} rx={8} fill="#2d2d3a" />
          <ellipse cx={66} cy={183} rx={11} ry={6} fill="#f0f0f0" />
          <rect x={56} y={179} width={20} height={8} rx={4} fill="#e8e8e8" />
        </g>
        {/* Body */}
        <rect x={28} y={72} width={54} height={62} rx={12} fill="#d9a0a0" />
        <path d="M55 80 L40 90 L40 130 L55 130Z" fill="#c48080" />
        <path d="M55 80 L70 90 L70 130 L55 130Z" fill="#c48080" />
        <rect x={50} y={82} width={10} height={30} rx={2} fill="white" />
        <path d="M55 88 L52 110 L55 115 L58 110Z" fill="#c45a5a" />
        {/* Left arm */}
        <g className={walking ? 'arm-l' : ''} style={{ transformOrigin: '35px 80px' }}>
          <rect x={14} y={75} width={14} height={46} rx={7} fill="#d9a0a0" />
          <ellipse cx={21} cy={123} rx={8} ry={7} fill="#f4c08a" />
        </g>
        {/* Right arm */}
        <g className={walking ? 'arm-r' : ''} style={{ transformOrigin: '75px 80px' }}>
          <rect x={82} y={75} width={14} height={46} rx={7} fill="#d9a0a0" />
          <ellipse cx={89} cy={123} rx={8} ry={7} fill="#f4c08a" />
        </g>
        {/* Neck */}
        <rect x={48} y={58} width={14} height={18} rx={7} fill="#f4c08a" />
        {/* Head */}
        <ellipse cx={55} cy={45} rx={26} ry={28} fill="#f4c08a" />
        {/* Hair */}
        <ellipse cx={55} cy={22} rx={26} ry={14} fill="#8B4513" />
        <rect x={29} y={22} width={52} height={12} fill="#8B4513" />
        {/* Eyes */}
        <circle cx={45} cy={42} r={4} fill="white" />
        <circle cx={65} cy={42} r={4} fill="white" />
        <circle cx={46} cy={43} r={2.5} fill="#2d1a0a" />
        <circle cx={66} cy={43} r={2.5} fill="#2d1a0a" />
        <circle cx={47} cy={42} r={0.8} fill="white" />
        <circle cx={67} cy={42} r={0.8} fill="white" />
        {/* Eyebrows */}
        <path d="M41 37 Q45 34 49 37" stroke="#5a3010" strokeWidth={2} fill="none" strokeLinecap="round" />
        <path d="M61 37 Q65 34 69 37" stroke="#5a3010" strokeWidth={2} fill="none" strokeLinecap="round" />
        {/* Smile */}
        <path d="M47 52 Q55 58 63 52" stroke="#c0703a" strokeWidth={2} fill="none" strokeLinecap="round" />
        {/* Ears */}
        <ellipse cx={29} cy={46} rx={5} ry={7} fill="#f4c08a" />
        <ellipse cx={81} cy={46} rx={5} ry={7} fill="#f4c08a" />
        {/* Buttons */}
        <circle cx={55} cy={115} r={2.5} fill="#a06060" />
        <circle cx={55} cy={124} r={2.5} fill="#a06060" />
      </g>
    </svg>
  )
}

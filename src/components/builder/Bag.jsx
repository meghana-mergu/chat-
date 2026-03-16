export default function Bag({ lidOpen }) {
  return (
    <svg viewBox="0 0 70 58" width={70} height={58}>
      {/* Handle */}
      <path
        d="M24 14 Q24 6 35 6 Q46 6 46 14"
        fill="none" stroke="#7a3e10" strokeWidth={4.5} strokeLinecap="round"
      />
      {/* Body */}
      <rect x={4} y={14} width={62} height={40} rx={6} fill="#8B4513" />
      <rect x={8} y={17} width={54} height={6} rx={3} fill="rgba(255,255,255,0.15)" />
      <line x1={4} y1={34} x2={66} y2={34} stroke="#6b330f" strokeWidth={1.5} />
      {/* Clasp */}
      <rect x={27} y={28} width={16} height={12} rx={3} fill="#c8861a" />
      <rect x={29} y={30} width={12} height={8}  rx={2} fill="#f0a830" />
      <circle cx={35} cy={34} r={2} fill="#c8861a" />
      {/* Lid */}
      <g
        className="bag-lid"
        style={{ transform: lidOpen ? 'rotateX(-140deg)' : 'rotateX(0deg)' }}
      >
        <rect x={4}  y={14} width={62} height={22} rx={6}   fill="#a0522d" />
        <rect x={8}  y={17} width={54} height={5}  rx={2.5} fill="rgba(255,255,255,0.18)" />
        <rect x={27} y={30} width={16} height={5}  rx={2.5} fill="#c8861a" />
      </g>
    </svg>
  )
}

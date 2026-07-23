'use client'

const NODES: [number, number, number, string][] = [
  [55,  90,  3.5, '3.8s'],
  [330, 155, 4.0, '5.1s'],
  [195, 355, 4.5, '4.3s'],
  [65,  568, 3.2, '6.0s'],
  [326, 574, 3.8, '3.2s'],
  [368, 762, 2.8, '7.2s'],
]

const PATHS = [
  { id: 'p0', d: 'M55,90 L330,155' },
  { id: 'p1', d: 'M55,90 L195,355' },
  { id: 'p2', d: 'M330,155 L195,355' },
  { id: 'p3', d: 'M195,355 L65,568' },
  { id: 'p4', d: 'M195,355 L326,574' },
  { id: 'p5', d: 'M65,568 L326,574' },
  { id: 'p6', d: 'M326,574 L368,762' },
]

const FLOWS = [
  { path: 'p0', dur: '9s',  begin: '0s'   },
  { path: 'p2', dur: '11s', begin: '2.4s' },
  { path: 'p1', dur: '13s', begin: '1.1s' },
  { path: 'p3', dur: '10s', begin: '3.7s' },
  { path: 'p4', dur: '8s',  begin: '5.2s' },
  { path: 'p6', dur: '7s',  begin: '0.8s' },
]

export function BackgroundGraphic() {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    >
      {/* Dot grid */}
      <div className="bg-dot-grid absolute inset-0" />

      {/* Gradient orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Financial constellation */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {PATHS.map(p => <path key={p.id} id={p.id} d={p.d} />)}
        </defs>

        {/* Static connector lines */}
        {PATHS.map(p => (
          <use key={p.id} href={`#${p.id}`} className="c-line" />
        ))}

        {/* Pulsing nodes */}
        {NODES.map(([cx, cy, r, dur], i) => (
          <circle key={i} cx={cx} cy={cy} r={r} className="c-node">
            <animate
              attributeName="opacity"
              values="0.25;0.60;0.25"
              dur={dur}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values={`${r};${r + 1.4};${r}`}
              dur={dur}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* Money-flow dots travelling along paths */}
        {FLOWS.map(({ path, dur, begin }, i) => (
          <circle key={i} r="2" className="flow-dot">
            <animateMotion dur={dur} begin={begin} repeatCount="indefinite">
              <mpath href={`#${path}`} />
            </animateMotion>
            <animate
              attributeName="opacity"
              values="0;0.75;0.75;0"
              keyTimes="0;0.08;0.92;1"
              dur={dur}
              begin={begin}
              repeatCount="indefinite"
            />
          </circle>
        ))}
      </svg>
    </div>
  )
}

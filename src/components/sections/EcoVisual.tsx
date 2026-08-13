/** Ecosystem diagram SVG from the static homepage (public/index.html). */

export default function EcoVisual() {
  return (
    <svg viewBox="0 0 500 500" width="100%" height="100%" aria-hidden="true">
      <path className="eco-flow" d="M250 250 L250 90" stroke="var(--green)" strokeWidth="1.6" />
      <path className="eco-flow delay-03" d="M250 250 L400 165" stroke="var(--orange)" strokeWidth="1.6" />
      <path className="eco-flow delay-06" d="M250 250 L400 335" stroke="var(--cyan)" strokeWidth="1.6" />
      <path className="eco-flow delay-09" d="M250 250 L250 410" stroke="var(--green)" strokeWidth="1.6" />
      <path className="eco-flow delay-12" d="M250 250 L100 335" stroke="var(--cyan)" strokeWidth="1.6" />
      <path className="eco-flow delay-15" d="M250 250 L100 165" stroke="var(--orange)" strokeWidth="1.6" />

      <g className="eco-hub-ring">
        <circle cx="250" cy="250" r="70" fill="none" stroke="rgba(255,255,255,0.15)" strokeDasharray="2 8" />
      </g>
      <circle cx="250" cy="250" r="52" fill="var(--navy-900)" stroke="var(--white)" strokeOpacity="0.25" />
      <foreignObject x="212" y="212" width="76" height="76">
        <div className="logo-chip-circle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/images/zigma.png" className="img-cover-circle" alt="Zigma" />
        </div>
      </foreignObject>

      <g className="eco-node eco-pulse">
        <circle cx="250" cy="70" r="30" fill="var(--navy-900)" stroke="var(--green)" strokeWidth="1.6" />
        <path
          d="M250 58v-8M240 70h-8M260 70h8M243 63l-6-6M257 77l6 6M243 77l-6 6M257 63l6-6"
          stroke="var(--green)"
          strokeWidth="1.4"
        />
        <circle cx="250" cy="70" r="6" fill="none" stroke="var(--green)" strokeWidth="1.4" />
        <text x="250" y="115" textAnchor="middle" fontSize="11" fill="#B7C2D6">
          Solar Energy
        </text>
      </g>

      <g className="eco-node eco-pulse delay-03">
        <circle cx="400" cy="165" r="30" fill="var(--navy-900)" stroke="var(--orange)" strokeWidth="1.6" />
        <path d="M403 152l-11 18h13l-11 18" stroke="var(--orange)" strokeWidth="1.8" fill="none" />
        <text x="400" y="210" textAnchor="middle" fontSize="11" fill="#B7C2D6">
          Power Backup
        </text>
      </g>

      <g className="eco-node eco-pulse delay-06">
        <circle cx="400" cy="335" r="30" fill="var(--navy-900)" stroke="var(--cyan)" strokeWidth="1.6" />
        <circle cx="400" cy="335" r="8" fill="none" stroke="var(--cyan)" strokeWidth="1.4" />
        <path d="M400 319v-6M400 351v6M384 335h-6M416 335h6" stroke="var(--cyan)" strokeWidth="1.4" />
        <text x="400" y="380" textAnchor="middle" fontSize="11" fill="#B7C2D6">
          Automation
        </text>
      </g>

      <g className="eco-node eco-pulse delay-09">
        <circle cx="250" cy="410" r="30" fill="var(--navy-900)" stroke="var(--green)" strokeWidth="1.6" />
        <path
          d="M250 396c10 0 16 8 14 18-10 2-18-4-18-14-2 6 0 12 4 16"
          stroke="var(--green)"
          strokeWidth="1.4"
          fill="none"
        />
        <text x="250" y="455" textAnchor="middle" fontSize="11" fill="#B7C2D6">
          Sustainable Power
        </text>
      </g>

      <g className="eco-node eco-pulse delay-12">
        <circle cx="100" cy="335" r="30" fill="var(--navy-900)" stroke="var(--cyan)" strokeWidth="1.6" />
        <path d="M100 320l-9 15h9l-6 12" stroke="var(--cyan)" strokeWidth="1.6" fill="none" />
        <text x="100" y="380" textAnchor="middle" fontSize="10.5" fill="#B7C2D6">
          Electrical Engg.
        </text>
      </g>

      <g className="eco-node eco-pulse delay-15">
        <circle cx="100" cy="165" r="30" fill="var(--navy-900)" stroke="var(--orange)" strokeWidth="1.6" />
        <path d="M85 175h30M85 165h30M85 155h30" stroke="var(--orange)" strokeWidth="1.4" />
        <text x="100" y="210" textAnchor="middle" fontSize="10.5" fill="#B7C2D6">
          Distribution
        </text>
      </g>
    </svg>
  );
}

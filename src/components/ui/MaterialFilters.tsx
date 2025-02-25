
"use client"

export function MaterialFilters() {
  return (
    <svg width="0" height="0" className="hidden">
      <defs>
        {/* Brushed metal effect */}
        <filter id="filter-brushed-metal">
          <feTurbulence type="fractalNoise" baseFrequency="0.15" numOctaves="3" seed="1" />
          <feDisplacementMap in="SourceGraphic" scale="3" />
          <feComposite operator="in" in2="SourceGraphic" />
        </filter>
        
        {/* Sandblasted metal effect */}
        <filter id="filter-sandblasted">
          <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="5" result="noise" />
          <feColorMatrix type="matrix" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 0.07 0" result="softNoise" />
          <feComposite operator="in" in="softNoise" in2="SourceGraphic" result="noiseClip" />
          <feBlend mode="soft-light" in="SourceGraphic" in2="noiseClip" />
        </filter>
        
        {/* Engraved text effect */}
        <filter id="filter-engraved-text">
          <feOffset dx="0.5" dy="0.5" in="SourceAlpha" result="offsetAlpha" />
          <feFlood floodColor="rgba(255,255,255,0.15)" result="accentColor" />
          <feComposite operator="in" in="accentColor" in2="offsetAlpha" result="highlight" />
          <feFlood floodColor="rgba(0,0,0,0.5)" result="shadowColor" />
          <feComposite operator="in" in="shadowColor" in2="SourceAlpha" result="shadow" />
          <feOffset dx="-0.5" dy="-0.5" in="shadow" result="offsetShadow" />
          <feMerge>
            <feMergeNode in="offsetShadow" />
            <feMergeNode in="SourceGraphic" />
            <feMergeNode in="highlight" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}

export default MaterialFilters;

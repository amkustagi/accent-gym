// Tiny Hustler coaches: three animated characters the user can pick from.
// Drawn as inline SVG so they scale on any screen; CSS in styles.css (".th") animates them:
// .bob breathes, .eye blinks, .head tilts while listening, .m-talk moves while speaking.
import type { ReactElement } from 'react';
import type { CoachId } from '../content/coaches';

export type CoachMode = 'idle' | 'listening' | 'talking';

const ART: Record<CoachId, ReactElement> = {
  hustle: (
    <>
      <g className="bob">
      <path d="M84 362 C84 292 108 252 150 252 C192 252 216 292 216 362 Z" fill="#1F2D4D"/>
      <path d="M112 258 C120 280 180 280 188 258 C178 250 122 250 112 258 Z" fill="#2E406A"/>
      <path d="M140 300 l10 -14 l10 14 h-6 v12 h-8 v-12 z" fill="#FFB020"/>
      <rect x="136" y="214" width="28" height="44" rx="12" fill="#F2C9A8"/>
      <g className="head">
      <path d="M62 128 C50 70 92 30 150 30 C210 30 252 70 238 132 C236 160 226 176 214 186 L86 186 C74 176 64 160 62 128 Z" fill="#232338"/>
      <path d="M74 128 C74 72 108 50 150 50 C192 50 226 72 226 128 C226 182 194 224 150 226 C106 224 74 182 74 128 Z" fill="#FFE3CC"/>
      <path d="M68 122 C64 66 102 36 152 36 C204 36 240 66 232 124 C226 108 220 100 212 96 C210 110 204 120 196 126 C196 108 190 96 182 90 C176 106 164 116 150 120 C150 104 144 92 134 86 C128 104 116 116 102 122 C104 108 102 98 96 92 C86 100 76 110 68 122 Z" fill="#2A2A42"/>
      <path d="M150 38 C146 18 162 8 176 14 C164 16 158 26 156 38 Z" fill="#2A2A42"/>
      <ellipse cx="100" cy="176" rx="13" ry="7" fill="#FF8FA3" opacity="0.45"/>
      <ellipse cx="200" cy="176" rx="13" ry="7" fill="#FF8FA3" opacity="0.45"/>
      <g className="eyes">
      <g className="eye"><ellipse cx="114" cy="146" rx="17" ry="22" fill="#fff"/><ellipse cx="116" cy="149" rx="14" ry="19" fill="#2B2350"/><ellipse cx="116" cy="157" rx="11" ry="10" fill="#F08A24"/><ellipse cx="116" cy="150" rx="6" ry="8" fill="#140F2B"/><circle cx="110" cy="141" r="5" fill="#fff"/><circle cx="122" cy="158" r="2.4" fill="#fff"/><path d="M95 133 Q114 118 134 132" stroke="#1A1A2E" strokeWidth="5" fill="none" strokeLinecap="round"/></g>
      <g className="eye"><ellipse cx="186" cy="146" rx="17" ry="22" fill="#fff"/><ellipse cx="184" cy="149" rx="14" ry="19" fill="#2B2350"/><ellipse cx="184" cy="157" rx="11" ry="10" fill="#F08A24"/><ellipse cx="184" cy="150" rx="6" ry="8" fill="#140F2B"/><circle cx="178" cy="141" r="5" fill="#fff"/><circle cx="190" cy="158" r="2.4" fill="#fff"/><path d="M166 132 Q186 118 205 133" stroke="#1A1A2E" strokeWidth="5" fill="none" strokeLinecap="round"/></g>
      </g>
      <path d="M100 118 Q113 112 126 116" stroke="#2A2A42" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path d="M174 116 Q187 112 200 118" stroke="#2A2A42" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path className="m-idle" d="M138 192 Q150 202 162 192" stroke="#8A3B2E" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path className="m-talk" d="M136 190 Q150 188 164 190 Q160 208 150 208 Q140 208 136 190 Z" fill="#8A3B2E"/>
      <ellipse className="m-listen" cx="150" cy="196" rx="5" ry="5.5" fill="#8A3B2E"/>
      <path d="M66 132 C62 60 238 60 234 132" stroke="#3A3F55" strokeWidth="7" fill="none"/>
      <rect x="58" y="120" width="18" height="34" rx="8" fill="#FFB020"/>
      <path d="M68 152 C72 186 98 200 126 198" stroke="#3A3F55" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <circle cx="128" cy="198" r="5" fill="#3A3F55"/>
      </g>
      </g>
    </>
  ),
  mira: (
    <>
      <g className="bob">
      <path d="M60 128 C56 62 100 32 150 32 C200 32 244 62 240 128 L246 236 C230 244 214 240 206 230 L94 230 C86 240 70 244 54 236 Z" fill="#3B2A24"/>
      <path d="M86 362 C86 292 108 254 150 254 C192 254 214 292 214 362 Z" fill="#0F766E"/>
      <path d="M128 256 L150 300 L172 256 Z" fill="#F8FAFC"/>
      <path d="M126 256 L150 300 L136 362 L112 362 L118 300 Z" fill="#115E59"/>
      <path d="M174 256 L150 300 L164 362 L188 362 L182 300 Z" fill="#115E59"/>
      <circle cx="186" cy="290" r="4" fill="#FCD34D"/>
      <rect x="137" y="214" width="26" height="44" rx="12" fill="#F1C3A0"/>
      <g className="head">
      <path d="M76 128 C76 74 108 52 150 52 C192 52 224 74 224 128 C224 180 194 222 150 224 C106 222 76 180 76 128 Z" fill="#FFE1CB"/>
      <path d="M70 140 C64 70 100 40 150 40 C204 40 238 72 230 140 C222 120 214 104 206 94 C190 112 160 116 132 100 C120 112 104 116 92 112 C84 120 76 130 70 140 Z" fill="#4A3329"/>
      <path d="M206 94 C214 110 222 124 230 140 C232 120 228 104 220 92 Z" fill="#3B2A24"/>
      <ellipse cx="102" cy="178" rx="13" ry="7" fill="#FF8FA3" opacity="0.45"/>
      <ellipse cx="198" cy="178" rx="13" ry="7" fill="#FF8FA3" opacity="0.45"/>
      <g className="eyes">
      <g className="eye"><ellipse cx="116" cy="150" rx="15" ry="19" fill="#fff"/><ellipse cx="117" cy="153" rx="12" ry="16" fill="#1F3B3A"/><ellipse cx="117" cy="160" rx="9" ry="8" fill="#2DD4BF"/><ellipse cx="117" cy="154" rx="5" ry="7" fill="#0B1F1E"/><circle cx="112" cy="146" r="4.5" fill="#fff"/><circle cx="122" cy="161" r="2" fill="#fff"/><path d="M99 138 Q116 126 133 137" stroke="#1A1A1A" strokeWidth="4.5" fill="none" strokeLinecap="round"/><path d="M99 138 l-6 -4" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round"/></g>
      <g className="eye"><ellipse cx="184" cy="150" rx="15" ry="19" fill="#fff"/><ellipse cx="183" cy="153" rx="12" ry="16" fill="#1F3B3A"/><ellipse cx="183" cy="160" rx="9" ry="8" fill="#2DD4BF"/><ellipse cx="183" cy="154" rx="5" ry="7" fill="#0B1F1E"/><circle cx="178" cy="146" r="4.5" fill="#fff"/><circle cx="188" cy="161" r="2" fill="#fff"/><path d="M167 137 Q184 126 201 138" stroke="#1A1A1A" strokeWidth="4.5" fill="none" strokeLinecap="round"/><path d="M201 138 l6 -4" stroke="#1A1A1A" strokeWidth="3" strokeLinecap="round"/></g>
      </g>
      <circle cx="116" cy="150" r="25" stroke="#7C5C3B" strokeWidth="3" fill="none"/>
      <circle cx="184" cy="150" r="25" stroke="#7C5C3B" strokeWidth="3" fill="none"/>
      <path d="M141 148 Q150 142 159 148" stroke="#7C5C3B" strokeWidth="3" fill="none"/>
      <path d="M102 120 Q115 114 128 118" stroke="#4A3329" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path d="M172 118 Q185 114 198 120" stroke="#4A3329" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path className="m-idle" d="M140 194 Q150 201 160 194" stroke="#9B3D3D" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
      <path className="m-talk" d="M138 192 Q150 190 162 192 Q158 207 150 207 Q142 207 138 192 Z" fill="#9B3D3D"/>
      <ellipse className="m-listen" cx="150" cy="197" rx="4.5" ry="5" fill="#9B3D3D"/>
      <path d="M206 70 l10 -8 l4 10 z" fill="#FCD34D"/>
      </g>
      </g>
    </>
  ),
  pip: (
    <>
      <g className="bob">
      <ellipse cx="150" cy="350" rx="80" ry="8" fill="#000" opacity="0.08"/>
      <path d="M212 300 C252 300 268 262 254 232 C246 262 230 276 206 278 Z" fill="#F59E0B"/>
      <path d="M254 232 C262 250 258 266 250 276 C250 262 252 246 254 232 Z" fill="#FFF7ED"/>
      <g className="head">
      <path d="M84 120 L70 30 L130 84 Z" fill="#F59E0B"/><path d="M86 104 L80 52 L116 86 Z" fill="#FFD9E0"/>
      <path d="M216 120 L230 30 L170 84 Z" fill="#F59E0B"/><path d="M214 104 L220 52 L184 86 Z" fill="#FFD9E0"/>
      <path d="M150 64 C224 64 252 126 250 200 C248 284 206 344 150 344 C94 344 52 284 50 200 C48 126 76 64 150 64 Z" fill="#FDBA74"/>
      <path d="M150 170 C200 170 226 214 222 262 C218 316 190 342 150 342 C110 342 82 316 78 262 C74 214 100 170 150 170 Z" fill="#FFF7ED"/>
      <path d="M138 66 C140 48 152 40 160 30 C160 44 168 52 162 66 Z" fill="#FFB020"/>
      <ellipse cx="94" cy="196" rx="14" ry="8" fill="#FF8FA3" opacity="0.5"/>
      <ellipse cx="206" cy="196" rx="14" ry="8" fill="#FF8FA3" opacity="0.5"/>
      <g className="eyes">
      <g className="eye"><ellipse cx="112" cy="160" rx="18" ry="23" fill="#2A1B3D"/><ellipse cx="112" cy="168" rx="13" ry="11" fill="#7C3AED"/><circle cx="105" cy="152" r="6.5" fill="#fff"/><circle cx="119" cy="171" r="3" fill="#fff"/></g>
      <g className="eye"><ellipse cx="188" cy="160" rx="18" ry="23" fill="#2A1B3D"/><ellipse cx="188" cy="168" rx="13" ry="11" fill="#7C3AED"/><circle cx="181" cy="152" r="6.5" fill="#fff"/><circle cx="195" cy="171" r="3" fill="#fff"/></g>
      </g>
      <ellipse cx="150" cy="188" rx="7" ry="5" fill="#3B2A24"/>
      <path className="m-idle" d="M138 200 Q144 207 150 200 Q156 207 162 200" stroke="#3B2A24" strokeWidth="3" fill="none" strokeLinecap="round"/>
      <path className="m-talk" d="M138 200 Q150 198 162 200 Q158 218 150 218 Q142 218 138 200 Z" fill="#9B3D3D"/>
      <ellipse className="m-listen" cx="150" cy="206" rx="4.5" ry="5" fill="#9B3D3D"/>
      <path d="M86 236 C112 252 188 252 214 236 L218 254 C190 272 110 272 82 254 Z" fill="#2563EB"/>
      <path d="M184 256 L198 300 L176 296 Z" fill="#1D4ED8"/>
      </g>
      </g>
    </>
  ),
};

export function CoachAvatar({ id, mode = 'idle', size = 96, label }: { id: CoachId; mode?: CoachMode; size?: number; label?: string }) {
  return (
    <svg
      className={`th ${mode}`}
      viewBox="0 0 300 360"
      width={size}
      height={Math.round(size * 1.2)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ flex: 'none', display: 'block' }}
    >
      <g className="waves" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round">
        <path d="M250 120 q12 18 0 36" />
        <path d="M262 108 q20 30 0 60" />
        <path d="M274 96 q28 42 0 84" />
      </g>
      {ART[id]}
    </svg>
  );
}

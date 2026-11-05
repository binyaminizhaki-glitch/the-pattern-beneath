import type { Agent, Channel, InstitutionId, TurnSnapshot } from '../sim/types';
import { randomAt } from '../sim/rng';

function Tree({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} className="engraving-tree">
      <path d="M0 3v-37m0 24L-12-23m12 2L13-32M0-29l-7-10" />
      <path d="M-2-48c-11-16-30-1-24 11-15 7-7 27 5 26 0 15 18 19 24 7 14 9 29-4 21-16 15-13 3-31-8-27-2-14-15-17-18-1Z" />
      <path
        d="m-18-35 8 3m-15 7 10 1m-4 7 12-2m13-22 10 7m-4 8 13 3M7-13l10-1M-1-38l8 8"
        opacity=".5"
      />
    </g>
  );
}
function Building({ x, y, kind }: { x: number; y: number; kind: InstitutionId }) {
  const school = kind === 'school';
  const clinic = kind === 'clinic';
  return (
    <g transform={`translate(${x} ${y})`} className="building">
      <ellipse cx="5" cy="10" rx="86" ry="16" className="building-shadow" />
      <path d="m-66-5 103 9 28-19-100-8Z" className="steps" />
      <path d="M-56-9V-86H36V0Z" className="building-front" />
      <path d="m36 0 29-20v-72L36-86Z" className="building-side" />
      <path d="m-68-86 55-54 62 50Z" className="roof" />
      <path d="m-13-140 30-15 60 55-28 10Z" className="roof-side" />
      <path d="M-62-80h98m-93 8h93M-56-33h92" />
      {[-39, 8].map((n) => (
        <g key={n}>
          <path d={`M${n}-71v24h15v-24Zm0 11h15m-7-11v24`} />
          <path d={`M${n}-29v23h15v-23Zm0 11h15m-7-11v23`} />
        </g>
      ))}
      <path d="M-17-3v-34q8-9 17 0V-2M-17-16H0M49-72v22l9-6v-22Zm0 35v21l9-6v-21Z" />
      {school ? (
        <>
          <path d="M-24-130v-35h29v34m-33-35 19-22 19 22Z" className="building-front" />
          <circle cx="-9" cy="-150" r="7" />
          <path d="M-9-155v5h4M-9-188v-16m0 1 21 6-21 6" />
        </>
      ) : clinic ? (
        <>
          <path d="M-30-123v-35h13v25M24-125v-32h13v44" className="building-front" />
          <path d="M-18-91h19m-9-10v20" strokeWidth="3" />
        </>
      ) : (
        <>
          <path d="M-41-120v-32h14v20" className="building-front" />
          <path d="M-39-83h60v13h-60Z" className="sign" />
          <text x="-9" y="-74" textAnchor="middle" className="building-sign">
            GAZETTE
          </text>
        </>
      )}
      <path
        d="m-52-65 6-3m-6 10 6-3m-6 10 6-3m-6 17 6-3m-6 10 6-3m67-40 7-3m-7 10 7-3m-7 10 7-3m-7 20 7-3m-7 10 7-3"
        opacity=".45"
      />
    </g>
  );
}
export const tokenPosition = (index: number, seed: number) => {
  const group = Math.floor(index / 16);
  const col = index % 8;
  const row = Math.floor((index % 16) / 8);
  const origins = [
    [50, 277],
    [535, 277],
    [280, 435],
  ];
  return {
    x:
      origins[group][0] +
      col * 48 +
      (row ? 12 : 0) +
      randomAt(seed, -1, String(index), 'map-x') * 3,
    y: origins[group][1] + row * 48 + randomAt(seed, -1, String(index), 'map-y') * 3,
  };
};
export function TownIllustration({
  idPrefix,
  message,
  selected,
  snapshot,
  seed = 42,
  peers = false,
}: {
  idPrefix: string;
  message?: Channel;
  selected?: Agent;
  snapshot?: TurnSnapshot;
  seed?: number;
  peers?: boolean;
}) {
  const hatchId = `${idPrefix}-hatch`;
  return (
    <svg className="town-illustration" viewBox="0 0 920 520" fill="none" aria-hidden="true">
      <defs>
        <pattern
          id={hatchId}
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(35)"
        >
          <path d="M0 0v6" stroke="currentColor" strokeWidth=".65" />
        </pattern>
      </defs>
      <g className="land">
        <path d="M8 387C67 348 42 174 127 126S299 72 390 119s87 6 167-32 223-16 280 61 90 225 32 291-192 57-308 55-193 31-305-5S73 432 8 387Z" />
        <path d="M46 383c119-49 18-165 125-217s133-33 224 0 175-68 276-42 119 114 137 169M68 411c123-48 101-111 157-123s138 8 220-9 136-58 240-21 119 92 118 138M156 451c81-35 137-18 224 13s133-3 210-22 121-18 163-4" />
        <path d="M18 361q38-18 39-59M832 215q24 55 27 114M365 90q-48-35-105-15" />
      </g>
      <g className="roads">
        <path d="M200 252c-18 75 95 95 207 134M708 249c-8 76-92 97-213 140M250 220c142-48 288-65 413-8" />
        <path
          d="M200 252c-18 75 95 95 207 134M708 249c-8 76-92 97-213 140M250 220c142-48 288-65 413-8"
          className="road-center"
        />
      </g>
      <g className="field-hatching">
        {Array.from({ length: 30 }, (_, i) => (
          <path key={i} d={`m${60 + i * 26} ${350 + Math.sin(i) * 27} 12-3m-8 8 10-2`} />
        ))}
      </g>
      {[
        [90, 211, 0.8],
        [124, 157, 0.62],
        [315, 176, 0.65],
        [342, 230, 0.75],
        [580, 173, 0.65],
        [810, 229, 0.8],
        [849, 342, 0.8],
        [201, 405, 0.72],
        [160, 382, 0.58],
        [728, 403, 0.8],
        [676, 440, 0.55],
        [274, 101, 0.55],
        [548, 102, 0.6],
      ].map(([x, y, s], i) => (
        <Tree key={i} x={x} y={y} scale={s} />
      ))}
      <g className="garden">
        <path d="M352 323q40-55 80-9t68-7M367 329q32-36 55-8t60-8M377 338q26-24 43-8t40-7" />
        <path d="M89 340v19m19-27v19m-23-1 29-10m636-4v22m18-15v22m-24-17 46 13" />
      </g>
      <Building x={210} y={238} kind="school" />
      <Building x={705} y={237} kind="clinic" />
      <Building x={453} y={397} kind="gazette" />
      <g className="map-labels">
        <text x="210" y="65">
          VESPER SCHOOL
        </text>
        <text x="705" y="64">
          THE CLINIC
        </text>
        <text x="453" y="233">
          THE GAZETTE
        </text>
      </g>
      <g className="compass">
        <path d="M862 57v48m-19-24h38m-19-24-5 24h10Z" />
        <text x="862" y="45">
          N
        </text>
        <circle cx="862" cy="81" r="14" />
      </g>
      {peers && selected && snapshot && (
        <g className="peer-lines">
          {selected.peers.map((id) => {
            const from = tokenPosition(Number(selected.id.split('-')[1]), seed);
            const to = tokenPosition(Number(id.split('-')[1]), seed);
            return <path key={id} d={`M${from.x} ${from.y}Q460 240 ${to.x} ${to.y}`} />;
          })}
        </g>
      )}
      {message && (
        <g key={`${snapshot?.turn}-${message}`} className="message-path">
          <path
            d={
              message === 'clinic'
                ? 'M705 224Q470 80 200 285M705 224Q620 375 440 448'
                : message === 'gazette'
                  ? 'M453 383Q200 390 180 285M453 383Q710 390 720 285'
                  : 'M160 285Q460 530 730 285'
            }
          />
        </g>
      )}
      {snapshot && (
        <g className="small-map-tokens">
          {snapshot.agents.map((a, i) => {
            const p = tokenPosition(i, seed);
            return (
              <circle
                key={a.id}
                cx={p.x}
                cy={p.y}
                r="6"
                fill={a.belief > 0.2 ? 'var(--gold)' : a.belief < -0.2 ? 'var(--olive)' : '#d4cda9'}
                stroke="#7f856c"
                strokeWidth=".7"
              />
            );
          })}
        </g>
      )}
    </svg>
  );
}

import { motion, useReducedMotion } from 'motion/react';
import type { Agent, Channel, Decision, InstitutionId, TurnSnapshot } from '../sim/types';
import { randomAt } from '../sim/rng';
import { tokenPosition } from './TownMap';
import { art } from '../presentation/art';
import type { VisualEvent } from '../presentation/causality';

export const BUILDINGS: Record<InstitutionId, { x: number; y: number }> = {
  school: { x: 210, y: 238 },
  clinic: { x: 705, y: 237 },
  gazette: { x: 453, y: 397 },
};
function citizenPosition(snapshot: TurnSnapshot, seed: number, index: number, visiting: boolean) {
  const base = tokenPosition(index, seed);
  const d = snapshot.decisions[index];
  if (!d || !visiting) return base;
  const building = d.schoolAccess ? BUILDINGS.school : BUILDINGS.clinic;
  return { x: building.x - 75 + (index % 8) * 21, y: building.y + 27 + Math.floor(index / 8) * 18 };
}
function Person({ agent, index, published }: { agent: Agent; index: number; published: boolean }) {
  const coat = ['#65705b', '#8b7954', '#596c65', '#7d6254', '#929778', '#6c6655'][index % 6];
  const skin = ['#e1ca9d', '#caa376', '#b78d64', '#e5d5b5'][Math.floor(index / 6) % 4];
  return (
    <g className="person-body">
      <ellipse cx="0" cy="4" rx="9" ry="3" fill="#535b3d" opacity=".16" />
      <path
        d={agent.gender === 'woman' ? 'M-3-9Q-8-6-9 3H9Q7-6 3-9Z' : 'M-4-9-7 2H7L4-9ZM-3 2v4m6-4v4'}
        fill={coat}
        stroke="#3c4837"
        strokeWidth=".8"
      />
      <circle cx="0" cy="-13" r="4.5" fill={skin} stroke="#4b4938" strokeWidth=".7" />
      <path
        d={
          index % 4 === 0
            ? 'M-5-14q0-9 9-2M-5-14q-5-2-3 2'
            : index % 4 === 1
              ? 'M-7-17H7M-4-17v-4h8v4'
              : index % 4 === 2
                ? 'M-5-14q-2-9 8-5l3 6-5-3Z'
                : 'M-5-15q3-8 10 0'
        }
        fill="#4d4838"
        stroke="#4d4838"
        strokeWidth=".7"
      />
      {published && (
        <g className="publication-mark">
          <path d="M6-7h7v9H6Z" fill="#faf5df" stroke="#46533e" strokeWidth=".8" />
          <path d="M8-5h3M8-2h3" stroke="#46533e" strokeWidth=".7" />
        </g>
      )}
    </g>
  );
}
export default function TownScene({
  snapshot,
  seed,
  selectedId,
  onCitizen,
  onInstitution,
  phase = -1,
  channel,
  influenceRecords,
  events = [],
  compact = false,
  className = '',
  minimal = false,
  interactive = true,
}: {
  snapshot: TurnSnapshot;
  seed: number;
  selectedId: string;
  onCitizen: (id: string) => void;
  onInstitution: (id: InstitutionId) => void;
  phase?: number;
  channel?: Channel;
  influenceRecords?: readonly Decision[];
  events?: VisualEvent[];
  compact?: boolean;
  className?: string;
  minimal?: boolean;
  interactive?: boolean;
}) {
  const reduced = useReducedMotion();
  const selected = snapshot.agents.find((a) => a.id === selectedId)!;
  const origin =
    channel === 'clinic'
      ? BUILDINGS.clinic
      : channel === 'community'
        ? { x: 165, y: 350 }
        : BUILDINGS.gazette;
  const reached = (influenceRecords ?? snapshot.decisions).filter((d) => d.exposure > 0);
  const phaseEvents = events.filter((e) =>
    phase === 3
      ? e.kind === 'policy'
      : phase === 4
        ? e.kind === 'access' || e.kind === 'denial'
        : phase === 5
          ? e.kind === 'publication'
          : false,
  );
  const visibleEvents = phaseEvents.filter(
    (event, index) => phaseEvents.findIndex((e) => e.institution === event.institution) === index,
  );
  return (
    <div className={`town-scene ${className} ${phase === 3 ? 'policy-phase' : ''}`}>
      <svg
        className="world-svg"
        viewBox="0 0 920 550"
        preserveAspectRatio={minimal ? 'xMidYMid slice' : 'xMidYMid meet'}
        role="group"
        aria-label={`Vesper town, week ${snapshot.turn}. School, Clinic, Gazette and 48 persistent citizens.`}
      >
        <image
          href={art('town')}
          x="0"
          y="0"
          width="900"
          height="520"
          preserveAspectRatio="xMidYMid slice"
        />
        <g className="world-network" aria-hidden="true">
          {(phase === 1
            ? snapshot.agents.filter((a) => reached.some((d) => d.agentId === a.id)).slice(0, 12)
            : [selected]
          ).flatMap((agent) =>
            agent.peers.map((peer) => {
              const a = citizenPosition(snapshot, seed, Number(agent.id.split('-')[1]), false),
                b = citizenPosition(snapshot, seed, Number(peer.split('-')[1]), false);
              return (
                <path
                  key={`${agent.id}-${peer}`}
                  d={`M${a.x} ${a.y - 8}Q${(a.x + b.x) / 2} ${(a.y + b.y) / 2 - 35} ${b.x} ${b.y - 8}`}
                  className={phase === 1 ? 'active-link' : ''}
                />
              );
            }),
          )}
        </g>
        {phase === 0 && (
          <g className="release-pulse" aria-hidden="true">
            <circle cx={origin.x} cy={origin.y} r="45" />
            <circle cx={origin.x} cy={origin.y} r="70" />
          </g>
        )}
        {(phase === 0 || phase === 1) && (
          <g className="broadcast-lines" aria-hidden="true">
            {reached.slice(0, 16).map((d) => {
              const p = tokenPosition(Number(d.agentId.split('-')[1]), seed);
              return <path key={d.id} d={`M${origin.x} ${origin.y}Q460 120 ${p.x} ${p.y - 8}`} />;
            })}
          </g>
        )}
        <g className="institution-hitareas">
          {snapshot.institutions.map((institution) => {
            const p = BUILDINGS[institution.id];
            const restricted = institution.rule === 'restricted';
            return (
              <g
                key={institution.id}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={`Inspect ${institution.name}: ${institution.rule} access`}
                onClick={() => interactive && onInstitution(institution.id)}
                onKeyDown={(e) => {
                  if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onInstitution(institution.id);
                  }
                }}
                className={`world-building rule-${institution.rule}`}
              >
                <title>
                  {institution.name}: {institution.rule} access
                </title>
                <rect
                  x={p.x - 80}
                  y={p.y - 165}
                  width="160"
                  height="170"
                  rx="4"
                  className="building-hit"
                />
                <g transform={`translate(${p.x} ${p.y + 18})`} className="institution-flag">
                  <text textAnchor="middle" y="-19" className="building-name">
                    {minimal
                      ? institution.id === 'school'
                        ? 'School'
                        : institution.id === 'clinic'
                          ? 'Clinic'
                          : 'Gazette'
                      : institution.name}
                  </text>
                  <rect x="-64" y="-10" width="128" height="20" rx="2" />
                  <text textAnchor="middle" y="4">
                    {minimal
                      ? restricted
                        ? '×'
                        : institution.rule === 'partial'
                          ? '−'
                          : '✓'
                      : restricted
                        ? 'Restrictive rule'
                        : institution.rule === 'partial'
                          ? 'Partial access'
                          : 'Open access'}
                  </text>
                  {restricted && <path d="M-54-4v8m-3-8v8" />}
                </g>
                {phase === 3 && (
                  <circle className="building-reaction" cx={p.x} cy={p.y - 55} r="70" />
                )}
              </g>
            );
          })}
        </g>
        <g className="world-citizens">
          {snapshot.agents.map((agent, index) => {
            const p = citizenPosition(snapshot, seed, index, phase === 4);
            const d = snapshot.decisions.find((d) => d.agentId === agent.id)!;
            const changed = Math.abs(d.beliefAfter - d.beliefBefore) > 0.035;
            const state =
              agent.belief > 0.2 ? 'hierarchy' : agent.belief < -0.2 ? 'agency' : 'undecided';
            return (
              <motion.g
                key={agent.id}
                initial={false}
                animate={{ x: p.x, y: p.y }}
                transition={{ duration: reduced ? 0 : 0.75, ease: 'easeInOut' }}
                className={`world-person ${state} ${agent.id === selectedId ? 'followed' : ''} ${phase === 2 && changed ? 'belief-reaction' : ''}`}
                role={compact || !interactive ? undefined : 'button'}
                tabIndex={compact || !interactive ? undefined : 0}
                aria-hidden={compact ? true : undefined}
                aria-label={
                  compact
                    ? undefined
                    : `Follow ${agent.name}, ${agent.gender}; ${state}${d.published ? '; published this week' : ''}`
                }
                onClick={() => interactive && onCitizen(agent.id)}
                onKeyDown={(e) => {
                  if (interactive && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onCitizen(agent.id);
                  }
                }}
              >
                <title>
                  {agent.name} ·{' '}
                  {d.published
                    ? 'Published this week'
                    : d.schoolAccess
                      ? 'Seminar admitted'
                      : 'Seminar declined'}
                </title>
                <rect
                  x="-14"
                  y="-25"
                  width="28"
                  height="34"
                  fill="transparent"
                  className="person-hit"
                />
                <ellipse className="belief-ring" cx="0" cy="-7" rx="12" ry="15" />
                <g
                  className="person-idle"
                  style={{ animationDelay: `-${randomAt(seed, -1, agent.id, 'idle') * 5}s` }}
                >
                  <Person
                    agent={agent}
                    index={index}
                    published={phase < 0 || phase >= 5 ? d.published : false}
                  />
                </g>
                {phase === 2 && changed && (
                  <text className="belief-symbol" x="11" y="-21">
                    {d.beliefAfter < d.beliefBefore ? '−' : '+'}
                  </text>
                )}
                {phase === 4 && (
                  <text
                    className={`access-symbol ${d.schoolAccess ? 'granted' : 'denied'}`}
                    x="11"
                    y="-21"
                  >
                    {d.schoolAccess ? '✓' : '×'}
                  </text>
                )}
              </motion.g>
            );
          })}
        </g>
        {phase === 5 && (
          <g className="publication-trails" aria-hidden="true">
            {snapshot.decisions
              .filter((d) => d.published)
              .map((d) => {
                const p = tokenPosition(Number(d.agentId.split('-')[1]), seed);
                return <path key={d.id} d={`M${p.x} ${p.y}Q453 310 453 365`} />;
              })}
          </g>
        )}
        {!minimal &&
          visibleEvents.map((event) => (
            <g
              key={event.institution}
              className={`world-event ${event.kind}`}
              transform={`translate(${BUILDINGS[event.institution].x} ${BUILDINGS[event.institution].y - 177})`}
              aria-hidden="true"
            >
              <rect x="-155" y="-29" width="310" height="30" rx="3" />
              <text textAnchor="middle" y="-10">
                {event.text}
              </text>
            </g>
          ))}
      </svg>
    </div>
  );
}

import { Feather, GraduationCap, HeartHandshake, Newspaper } from 'lucide-react';
import { citizenHistory } from '../sim/engine';
import type { Agent, GameState } from '../sim/types';
import { art, characterArt } from '../presentation/art';

export const percent = (value: number | null) =>
  value === null ? 'Insufficient data' : `${Math.round(value * 100)}%`;
export function Portrait({ agent }: { agent: Agent }) {
  const image = characterArt(agent.id);
  if (image) return <img className="portrait painted-portrait" src={art(image)} alt="" />;
  return (
    <svg viewBox="0 0 70 80" className="portrait" aria-hidden="true">
      <path d="M0 0h70v80H0Z" fill="var(--paper-deep)" />
      <path d="M10 80q2-28 24-29 25-1 28 29" fill="var(--olive)" />
      <path d="M29 50v12l7 7 8-9-3-14" fill="var(--paper)" />
      <path
        d="M24 30q-1-17 14-17 16 0 15 19l-5 16q-13 16-23-1Z"
        fill="var(--paper)"
        stroke="var(--ink)"
      />
      <path
        d={
          agent.gender === 'woman'
            ? 'M25 46Q10 30 20 18q15-18 30-2 9 9 3 24l-6-19q-8 12-23 11ZM19 30q-9 14 2 22l5-7'
            : 'M22 30q-7-20 11-22 19-5 22 18l-6-6q-16 5-27 10Z'
        }
        fill="var(--ink)"
      />
      <path
        d="M39 32v8h4m-8 6h7m-11-14h3m11 0h3M16 80l8-16 12 5 12-7 10 18"
        fill="none"
        stroke="var(--ink)"
      />
    </svg>
  );
}
export function LifePanel({
  world,
  selectedId,
  onSelect,
  reveal = false,
}: {
  world: GameState;
  selectedId: string;
  onSelect: (id: string) => void;
  reveal?: boolean;
}) {
  const snapshot = world.snapshots[world.snapshots.length - 1];
  const agent = snapshot.agents.find((a) => a.id === selectedId)!;
  const history = citizenHistory(world, selectedId);
  return (
    <div className="life-panel">
      <label htmlFor="citizen-select">Choose a citizen</label>
      <select id="citizen-select" value={selectedId} onChange={(e) => onSelect(e.target.value)}>
        {snapshot.agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      <div className="life-intro">
        <Portrait agent={agent} />
        <div>
          <h3>{agent.name}</h3>
          <p>Hopes to study, write, and see the work reach an audience.</p>
        </div>
      </div>
      <dl className="life-facts">
        <div>
          <dt>Belief</dt>
          <dd>
            {agent.belief > 0.2
              ? 'Endorses hierarchy'
              : agent.belief < -0.2
                ? 'Questions hierarchy'
                : 'Undecided'}{' '}
            ({agent.belief.toFixed(2)})
          </dd>
        </div>
        <div>
          <dt>Confidence to act</dt>
          <dd>{percent(agent.agency)}</dd>
        </div>
        <div>
          <dt>Starting ability</dt>
          <dd>
            {reveal ? `${agent.baseAptitude.toFixed(3)} · unchanged` : 'Unmeasured by the town'}
          </dd>
        </div>
        <div>
          <dt>Social ties</dt>
          <dd>
            {agent.peers.map((id) => snapshot.agents.find((a) => a.id === id)!.name).join(', ')}
          </dd>
        </div>
      </dl>
      <p className="note">
        These records show what happened in the model. A rule can make rejection more likely; that
        does not mean it explains every no by itself.
      </p>
      {history.length === 0 ? (
        <p>
          The opening edition is recorded. Publish a narrative to begin this citizen’s eight-week
          history.
        </p>
      ) : (
        <ol className="life-history">
          {history.map((d) => (
            <li key={d.id}>
              <div className="history-week">
                Week {String(d.turn).padStart(2, '0')}
                <strong>
                  {d.published
                    ? 'Work published'
                    : d.manuscript
                      ? 'Manuscript declined'
                      : 'No completed work'}
                </strong>
              </div>
              <p>
                <GraduationCap size={16} />
                {d.reasons.school}
              </p>
              <p>
                <HeartHandshake size={16} />
                {d.reasons.clinic}
              </p>
              <p>
                <Feather size={16} />
                {d.reasons.writing}
              </p>
              <p>
                <Newspaper size={16} />
                {d.reasons.gazette}
              </p>
              <details>
                <summary>Inspect decision thresholds</summary>
                <div className="draw-table">
                  <span>Decision</span>
                  <span>Chance / draw</span>
                  <span>Seminar</span>
                  <span>
                    {d.schoolChance.toFixed(3)} / {d.schoolRoll.toFixed(3)}
                  </span>
                  <span>Writing support</span>
                  <span>
                    {d.clinicChance.toFixed(3)} / {d.clinicRoll.toFixed(3)}
                  </span>
                  <span>Manuscript</span>
                  <span>
                    {d.writingChance.toFixed(3)} / {d.writingRoll.toFixed(3)}
                  </span>
                  <span>Acceptance</span>
                  <span>
                    {d.editorialChance.toFixed(3)} / {d.editorialRoll.toFixed(3)}
                  </span>
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

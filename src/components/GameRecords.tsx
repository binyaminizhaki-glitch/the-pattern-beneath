import { useState } from 'react';
import Dialog from './Dialog';
import { Portrait } from './Evidence';
import { citizenHistory, latest } from '../sim/engine';
import type { GameState, InstitutionId } from '../sim/types';
import { art } from '../presentation/art';

export type RecordPanel =
  | { kind: 'citizen'; id: string; passive?: boolean }
  | { kind: 'institution'; id: InstitutionId; passive?: boolean };

export default function GameRecords({
  panel,
  world,
  baseline,
  onClose,
}: {
  panel: RecordPanel;
  world: GameState;
  baseline: GameState;
  onClose: () => void;
}) {
  const [citizenId, setCitizenId] = useState(panel.id);
  const recordWorld = panel.passive ? baseline : world;
  const snapshot = latest(recordWorld);
  if (panel.kind === 'institution') {
    const institution = snapshot.institutions.find((item) => item.id === panel.id)!;
    const total = snapshot.decisions.filter((entry) =>
      panel.id === 'school'
        ? entry.schoolAccess
        : panel.id === 'clinic'
          ? entry.clinicSupported
          : entry.published,
    ).length;
    return (
      <Dialog title={institution.name} onClose={onClose}>
        <img
          className="record-art"
          src={art(panel.id === 'gazette' ? 'gazette' : panel.id)}
          alt=""
        />
        <p className="record-week">
          Week {snapshot.turn}
          {panel.passive ? ' · No intervention' : ''}
        </p>
        <dl className="short-record">
          <div>
            <dt>Access</dt>
            <dd>
              {institution.rule === 'restricted'
                ? 'Restricted'
                : institution.rule === 'partial'
                  ? 'Partly open'
                  : 'Open'}
            </dd>
          </div>
          <div>
            <dt>
              {panel.id === 'school'
                ? 'Admitted'
                : panel.id === 'clinic'
                  ? 'Writing supported'
                  : 'Published'}
            </dt>
            <dd>{total} people</dd>
          </div>
        </dl>
        <details className="record-details">
          <summary>Details</summary>
          <p>Led by {snapshot.agents.find((agent) => agent.id === institution.leaderId)!.name}.</p>
          <p>Rules carry 75% of the previous week’s bias forward.</p>
          {panel.id === 'gazette' && (
            <>
              <p>
                <strong>Count:</strong> {snapshot.news.observation}
              </p>
              <p>
                <strong>Editor’s view:</strong> {snapshot.news.interpretation}
              </p>
            </>
          )}
        </details>
      </Dialog>
    );
  }
  const agent = snapshot.agents.find((item) => item.id === citizenId)!;
  const decision = snapshot.decisions.find((item) => item.agentId === citizenId)!;
  const other = world.isFinished
    ? latest(panel.passive ? world : baseline).decisions.find((item) => item.agentId === citizenId)
    : null;
  const rows = [
    ['Class', decision.schoolAccess, other?.schoolAccess],
    ['Writing time', decision.clinicSupported, other?.clinicSupported],
    ['Manuscript', decision.manuscript, other?.manuscript],
    ['Published', decision.published, other?.published],
  ] as const;
  return (
    <Dialog title={agent.name} onClose={onClose}>
      <div className="record-person">
        <Portrait agent={agent} />
        <div>
          <label htmlFor="record-person-select">Citizen</label>
          <select
            id="record-person-select"
            value={citizenId}
            onChange={(event) => setCitizenId(event.target.value)}
          >
            {snapshot.agents.map((person) => (
              <option value={person.id} key={person.id}>
                {person.name}
              </option>
            ))}
          </select>
          <p className="record-week">
            Week {snapshot.turn}
            {panel.passive ? ' · No intervention' : ''}
          </p>
        </div>
      </div>
      <table className="short-record-table">
        <thead>
          <tr>
            <th>Record</th>
            <th>{panel.passive ? 'No intervention' : 'Your town'}</th>
            {other && <th>{panel.passive ? 'Your town' : 'No intervention'}</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, value, otherValue]) => (
            <tr key={label}>
              <th>{label}</th>
              <td>{value ? 'Yes' : 'No'}</td>
              {other && <td>{otherValue ? 'Yes' : 'No'}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      <details className="record-details">
        <summary>History and decisions</summary>
        {citizenHistory(recordWorld, citizenId).map((entry) => (
          <section key={entry.id}>
            <h3>{entry.turn === 0 ? 'Opening record' : `Week ${entry.turn}`}</h3>
            <p>{entry.reasons.school}</p>
            <p>{entry.reasons.clinic}</p>
            <p>{entry.reasons.writing}</p>
            <p>{entry.reasons.gazette}</p>
          </section>
        ))}
      </details>
    </Dialog>
  );
}

import {
  X,
  BookOpen,
  GraduationCap,
  HeartHandshake,
  Feather,
  Newspaper,
  ArrowRight,
} from 'lucide-react';
import type { GameState, InstitutionId, TurnSnapshot } from '../sim/types';
import { citizenHistory } from '../sim/engine';
import { percent, Portrait } from './Evidence';
import { art } from '../presentation/art';

export default function Inspector({
  kind,
  id,
  snapshot,
  world,
  baseline,
  onClose,
  onDetails,
  onTalk,
  canTalk = true,
}: {
  kind: 'citizen' | 'institution';
  id: string;
  snapshot: TurnSnapshot;
  world: GameState;
  baseline?: TurnSnapshot;
  onClose: () => void;
  onDetails: () => void;
  onTalk: () => void;
  canTalk?: boolean;
}) {
  const agent = snapshot.agents.find((a) => a.id === id);
  const institution = snapshot.institutions.find((i) => i.id === (id as InstitutionId));
  if (kind === 'institution' && institution) {
    const leader = snapshot.agents.find((a) => a.id === institution.leaderId)!;
    const other = baseline?.institutions.find((i) => i.id === id);
    return (
      <aside className="inspector" role="dialog" aria-label="Institution inspector">
        <button
          className="inspector-close icon-button"
          onClick={onClose}
          aria-label="Close inspector"
        >
          <X size={18} />
        </button>
        <p className="folio">Institution · Week {snapshot.turn}</p>
        <img
          className="institution-art"
          src={art(institution.id === 'gazette' ? 'gazette' : institution.id)}
          alt=""
        />
        <h2>{institution.name}</h2>
        <p className={`policy-label ${institution.rule}`}>
          {institution.rule === 'restricted'
            ? 'Many requests refused'
            : institution.rule === 'partial'
              ? 'Some requests accepted'
              : 'Each request heard'}
        </p>
        <div className="inspector-measure">
          <span>Restriction</span>
          <strong>{percent(Math.max(0, institution.policyBias))}</strong>
        </div>
        {other && (
          <div className="inspector-measure">
            <span>Without intervention</span>
            <strong>{percent(Math.max(0, other.policyBias))}</strong>
          </div>
        )}
        <div className="policy-track">
          <i style={{ width: `${Math.max(0, institution.policyBias) * 100}%` }} />
        </div>
        <p className="inspector-note">
          Led by {leader.name}. Rules change slowly: 75% of the old bias carries into the next week.
        </p>
        <div className="institution-result">
          {institution.id === 'school'
            ? `${snapshot.decisions.filter((d) => d.schoolAccess).length} citizens admitted this week.`
            : institution.id === 'clinic'
              ? `${snapshot.decisions.filter((d) => d.clinicSupported).length} citizens received writing support.`
              : `${snapshot.decisions.filter((d) => d.published).length} of ${snapshot.decisions.filter((d) => d.manuscript).length} manuscripts published.`}
        </div>
        <button className="text-button" onClick={onDetails}>
          Inspect the evidence <BookOpen size={15} />
        </button>
        <button className="text-button talk-button" disabled={!canTalk} onClick={onTalk}>
          Hear the representative <ArrowRight size={15} />
        </button>
      </aside>
    );
  }
  if (!agent) return null;
  const d = snapshot.decisions.find((d) => d.agentId === id)!;
  const other = baseline?.decisions.find((d) => d.agentId === id);
  const record = (entry: typeof d, label: string) => (
    <div className="path-record">
      <h3>{label}</h3>
      <div>
        <GraduationCap size={16} />
        <span>{entry.schoolAccess ? 'Seminar admitted' : 'Seminar declined'}</span>
        <b className={entry.schoolAccess ? 'yes' : 'no'}>{entry.schoolAccess ? '✓' : '×'}</b>
      </div>
      <div>
        <HeartHandshake size={16} />
        <span>{entry.clinicSupported ? 'Writing supported' : 'Support withheld'}</span>
        <b className={entry.clinicSupported ? 'yes' : 'no'}>{entry.clinicSupported ? '✓' : '×'}</b>
      </div>
      <div>
        <Feather size={16} />
        <span>{entry.manuscript ? 'Manuscript completed' : 'No manuscript'}</span>
        <b>{entry.manuscript ? '✓' : '—'}</b>
      </div>
      <div>
        <Newspaper size={16} />
        <span>{entry.published ? 'Work published' : 'No published work'}</span>
        <b>{entry.published ? '✓' : '—'}</b>
      </div>
    </div>
  );
  return (
    <aside
      className={`inspector citizen-inspector ${other ? 'compare-inspector' : ''}`}
      role="dialog"
      aria-label="Citizen profile"
    >
      <button
        className="inspector-close icon-button"
        onClick={onClose}
        aria-label="Close inspector"
      >
        <X size={18} />
      </button>
      <div className="profile-heading">
        <Portrait agent={agent} />
        <div>
          <p className="folio">Follow a life · Week {snapshot.turn}</p>
          <h2>{agent.name}</h2>
        </div>
      </div>
      {!other && (
        <>
          <p className="citizen-belief">
            {agent.belief > 0.2
              ? 'Endorses hierarchy'
              : agent.belief < -0.2
                ? 'Questions hierarchy'
                : 'Undecided'}{' '}
            <span>{agent.belief.toFixed(2)}</span>
          </p>
          <div className="inspector-measure">
            <span>Confidence to act</span>
            <strong>{percent(agent.agency)}</strong>
          </div>
        </>
      )}
      <div className="path-records">
        {record(d, other ? 'Your town' : 'This week')}
        {other && record(other, 'No intervention')}
      </div>
      {baseline && (
        <p className="aptitude-note">
          Baseline aptitude {agent.baseAptitude.toFixed(3)} in both towns. Unchanged.
        </p>
      )}
      <div className="mini-life" aria-label="Publication history">
        {citizenHistory(world, id).map((entry) => (
          <span
            key={entry.id}
            title={`Week ${entry.turn}: ${entry.published ? 'published' : 'unpublished'}`}
            className={entry.published ? 'published' : ''}
          >
            {entry.turn}
          </span>
        ))}
      </div>
      <button className="text-button" onClick={onDetails}>
        Open the decision ledger <BookOpen size={15} />
      </button>
      <button className="text-button talk-button" disabled={!canTalk} onClick={onTalk}>
        Speak with {agent.name.split(' ')[0]} <ArrowRight size={15} />
      </button>
    </aside>
  );
}

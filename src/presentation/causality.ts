import type { InstitutionId, TurnSnapshot } from '../sim/types';

export const PHASES = [
  { title: 'Your story reaches town', duration: 400 },
  { title: 'People talk to people they know', duration: 650 },
  { title: 'Some change their minds', duration: 650 },
  { title: 'Leaders change the rules', duration: 600 },
  { title: 'Doors open. Doors close.', duration: 800 },
  { title: 'Some work gets printed', duration: 550 },
  { title: 'The Gazette explains the count', duration: 550 },
] as const;
export interface VisualEvent {
  text: string;
  institution: InstitutionId;
  agentId?: string;
  kind: 'access' | 'denial' | 'policy' | 'publication';
}
export function visualEvents(from: TurnSnapshot, to: TurnSnapshot): VisualEvent[] {
  const events: VisualEvent[] = [];
  for (const institution of to.institutions) {
    const prior = from.institutions.find((i) => i.id === institution.id)!;
    const change = institution.policyBias - prior.policyBias;
    if (Math.abs(change) > 0.012)
      events.push({
        institution: institution.id,
        kind: 'policy',
        text: `${institution.name.replace('Vesper ', 'The ')} ${change < 0 ? 'eased' : 'tightened'} its rule.`,
      });
  }
  const women = to.agents.filter((a) => a.gender === 'woman');
  const denied =
    women.find((a) => {
      const d = to.decisions.find((d) => d.agentId === a.id)!;
      const old = from.decisions.find((d) => d.agentId === a.id)!;
      return !d.schoolAccess && old.schoolAccess;
    }) ?? women.find((a) => !to.decisions.find((d) => d.agentId === a.id)!.schoolAccess);
  if (denied)
    events.push({
      text: `${denied.name} was declined a seminar.`,
      institution: 'school',
      agentId: denied.id,
      kind: 'denial',
    });
  const admitted = women.find((a) => {
    const d = to.decisions.find((d) => d.agentId === a.id)!;
    const old = from.decisions.find((d) => d.agentId === a.id)!;
    return d.schoolAccess && !old.schoolAccess;
  });
  if (admitted)
    events.push({
      text: `${admitted.name} gained seminar access.`,
      institution: 'school',
      agentId: admitted.id,
      kind: 'access',
    });
  const supported = women.find((a) => {
    const d = to.decisions.find((d) => d.agentId === a.id)!;
    const old = from.decisions.find((d) => d.agentId === a.id)!;
    return d.clinicSupported && !old.clinicSupported;
  });
  if (supported)
    events.push({
      text: `${supported.name} gained writing support.`,
      institution: 'clinic',
      agentId: supported.id,
      kind: 'access',
    });
  const published = women.find((a) => to.decisions.find((d) => d.agentId === a.id)!.published);
  if (published)
    events.push({
      text: `${published.name} reached the printed page.`,
      institution: 'gazette',
      agentId: published.id,
      kind: 'publication',
    });
  return events;
}
export function projectTransition(
  from: TurnSnapshot,
  to: TurnSnapshot,
  phase: number,
): TurnSnapshot {
  return {
    ...to,
    agents:
      phase >= 5
        ? to.agents
        : phase >= 2
          ? from.agents.map((agent) => {
              const next = to.agents.find((a) => a.id === agent.id)!;
              return phase >= 4
                ? { ...next, publications: agent.publications }
                : { ...agent, belief: next.belief };
            })
          : from.agents,
    institutions: phase >= 3 ? to.institutions : from.institutions,
    decisions: phase >= 4 ? to.decisions : from.decisions,
    metrics: phase >= 5 ? to.metrics : from.metrics,
    news: phase >= 6 ? to.news : from.news,
  };
}

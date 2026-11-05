import { clamp, mean, randomAt } from './rng';
import type {
  Agent,
  Channel,
  Decision,
  GameState,
  Institution,
  Metrics,
  News,
  PlayerAction,
  TurnSnapshot,
} from './types';

export const WEEKS = 8;
export const DEFAULT_SEED = 42;
export const CHANNEL_NAMES: Record<Channel, string> = {
  clinic: 'Physicians’ Council',
  gazette: 'Town Gazette',
  community: 'Community Circle',
};
const women = [
  'Clara',
  'Ada',
  'Florence',
  'Beatrice',
  'Eleanor',
  'Rose',
  'Martha',
  'Alice',
  'Edith',
  'Grace',
  'Lydia',
  'Nora',
  'Agnes',
  'Violet',
  'Helen',
  'Esther',
  'Iris',
  'Ruth',
  'Lucy',
  'Mabel',
  'Jane',
  'Celia',
  'Pearl',
  'Frances',
];
const men = [
  'Arthur',
  'Edmund',
  'Henry',
  'Thomas',
  'George',
  'Walter',
  'Frederick',
  'Samuel',
  'Edward',
  'James',
  'William',
  'Albert',
  'Charles',
  'Oliver',
  'Benjamin',
  'Theodore',
  'Louis',
  'Joseph',
  'Hugh',
  'Philip',
  'Robert',
  'Francis',
  'Daniel',
  'Leonard',
];
const surnames = [
  'Vale',
  'Ashby',
  'Bell',
  'Reed',
  'Finch',
  'Hale',
  'Moss',
  'West',
  'Blythe',
  'Wren',
  'Stone',
  'Brook',
  'Marsh',
  'Hart',
  'Grey',
  'Field',
  'Shaw',
  'Wells',
  'Lane',
  'Wood',
  'Page',
  'Cole',
  'Pike',
  'Rowe',
];
const citizenId = (n: number) => `citizen-${((n % 48) + 48) % 48}`;

export function initializeAgents(seed: number): readonly Agent[] {
  return Array.from({ length: 48 }, (_, i): Agent => {
    const id = citizenId(i);
    const pair = Math.floor(i / 2);
    return Object.freeze({
      id,
      pair,
      name: `${i % 2 === 0 ? women[pair] : men[pair]} ${surnames[pair]}`,
      gender: i % 2 === 0 ? 'woman' : 'man',
      baseAptitude: 0.45 + 0.5 * randomAt(seed, -1, `pair-${pair}`, 'aptitude'),
      belief: 0.12 + 0.65 * randomAt(seed, -1, id, 'belief'),
      authorityTrust: 0.35 + 0.6 * randomAt(seed, -1, id, 'trust'),
      susceptibility: 0.5 + 0.5 * randomAt(seed, -1, id, 'susceptibility'),
      resilience: 0.2 + 0.7 * randomAt(seed, -1, id, 'resilience'),
      peers: Object.freeze([
        citizenId(i - 1),
        citizenId(i + 1),
        citizenId(i - 6),
        citizenId(i + 6),
      ]),
      agency: 0.6,
      education: 0,
      opportunities: 0,
      publications: 0,
    });
  });
}
export function policyRule(
  bias: number,
  previous: Institution['rule'] = 'restricted',
): Institution['rule'] {
  // A dead band prevents rules chattering around the classification threshold.
  if (bias >= 0.38) return 'restricted';
  if (bias <= 0.12) return 'open';
  if (previous === 'restricted' && bias >= 0.3) return 'restricted';
  if (previous === 'open' && bias <= 0.2) return 'open';
  return 'partial';
}
export function exposureFor(
  seed: number,
  turn: number,
  agent: Agent,
  action: PlayerAction | null,
): number {
  if (!action) return 0;
  const index = Number(agent.id.split('-')[1]);
  const draw = randomAt(seed, turn, agent.id, `reach-${action.channel}`);
  if (action.channel === 'gazette')
    return draw < 0.9 ? 0.82 * (0.6 + 0.4 * agent.authorityTrust) : 0;
  if (action.channel === 'clinic') {
    const leader = index === 5 || index === 13 || index === 29;
    return leader || (agent.authorityTrust > 0.6 && draw < 0.78) ? 0.97 * agent.authorityTrust : 0;
  }
  // Rotating local circles. Neighbours carry the signal to other groups on later turns.
  return index % 3 === turn % 3 || (index === 13 && draw < 0.8)
    ? 0.88 * (0.75 + 0.25 * agent.resilience)
    : 0;
}
export function updateBeliefs(
  previous: TurnSnapshot,
  seed: number,
  turn: number,
  action: PlayerAction | null,
): readonly Agent[] {
  const byId = new Map(previous.agents.map((agent) => [agent.id, agent]));
  return previous.agents.map((agent) => {
    const peerMean = mean(agent.peers.map((id) => byId.get(id)!.belief));
    const relevant = previous.institutions[Number(agent.id.split('-')[1]) % 3];
    const authority = byId.get(relevant.leaderId)!.belief;
    const target = action?.narrative === 'hierarchy' ? 1 : -1;
    const exposure = exposureFor(seed, turn, agent, action);
    const resistance = agent.belief * target < -0.4 ? 0.62 : 1;
    const personal = previous.decisions.find((d) => d.agentId === agent.id);
    const testimony =
      agent.gender === 'woman' && personal && !personal.clinicSupported
        ? -0.025 * agent.resilience
        : 0;
    const change =
      0.18 * (peerMean - agent.belief) +
      0.1 * agent.authorityTrust * (authority - agent.belief) +
      0.48 * exposure * agent.susceptibility * resistance * (target - agent.belief) +
      0.065 * (0.5 + 0.5 * agent.authorityTrust) * (previous.news.signal - agent.belief) +
      testimony;
    return { ...agent, belief: clamp(agent.belief + change, -1, 1) };
  });
}
export function updateInstitutions(
  previous: readonly Institution[],
  agents: readonly Agent[],
): readonly Institution[] {
  const populationMean = mean(agents.map((a) => a.belief));
  return previous.map((institution) => {
    const leader = agents.find((a) => a.id === institution.leaderId)!;
    const target = 0.65 * leader.belief + 0.35 * populationMean;
    const policyBias = clamp(0.75 * institution.policyBias + 0.25 * target, -1, 1);
    return { ...institution, policyBias, rule: policyRule(policyBias, institution.rule) };
  });
}
export function makeDecisions(
  seed: number,
  turn: number,
  agents: readonly Agent[],
  institutions: readonly Institution[],
  action: PlayerAction | null,
  previousAgents: readonly Agent[] = agents,
): { agents: readonly Agent[]; decisions: readonly Decision[] } {
  const policy = (id: Institution['id']) =>
    Math.max(0, institutions.find((i) => i.id === id)!.policyBias);
  const decisions: Decision[] = [];
  const nextAgents = agents.map((agent) => {
    const female = agent.gender === 'woman' ? 1 : 0;
    const schoolChance = clamp(
      0.83 + 0.08 * (agent.baseAptitude - 0.7) - 0.74 * policy('school') * female,
      0.08,
      0.95,
    );
    const schoolRoll = randomAt(seed, turn, agent.id, 'school');
    const schoolAccess = schoolRoll < schoolChance;
    const clinicChance = clamp(0.94 - 0.86 * policy('clinic') * female, 0.06, 0.96);
    const clinicRoll = randomAt(seed, turn, agent.id, 'clinic');
    const clinicSupported = clinicRoll < clinicChance;
    const agency = clamp(
      0.78 * agent.agency + 0.22 * (clinicSupported ? 0.9 : 0.2) + 0.015 * agent.resilience,
    );
    const education = clamp(agent.education + (schoolAccess ? 0.09 : 0));
    const opportunity = schoolAccess || clinicSupported;
    const writingChance = opportunity
      ? clamp(
          0.12 +
            0.48 * agency +
            0.18 * Number(schoolAccess) +
            0.12 * education -
            0.22 * Math.max(0, agent.belief) * female,
        )
      : 0;
    const writingRoll = randomAt(seed, turn, agent.id, 'writing');
    const manuscript = opportunity && writingRoll < writingChance;
    const editorialChance = clamp(
      0.2 + 0.74 * agent.baseAptitude + 0.06 * education - 0.7 * policy('gazette') * female,
      0.04,
      0.97,
    );
    const editorialRoll = randomAt(seed, turn, agent.id, 'editorial');
    const published = manuscript && editorialRoll < editorialChance;
    const restricted = (id: Institution['id']) => female > 0 && policy(id) > 0.12;
    const schoolReason = schoolAccess
      ? 'School admitted the seminar application.'
      : restricted('school')
        ? 'The School refused the place. Its rule makes admission harder for women; chance also plays a part.'
        : 'The School refused the place under the same rule used for everyone.';
    const clinicReason = clinicSupported
      ? 'The Clinic backed time for writing.'
      : restricted('clinic')
        ? 'The Clinic refused writing time under the rule it calls protective.'
        : 'The Clinic did not back writing time under the same rule used for everyone.';
    const writingReason = !opportunity
      ? 'No seminar or supported writing time: no manuscript could be prepared.'
      : manuscript
        ? 'The writer used the chance to work and finished a manuscript.'
        : 'The writer had a chance to work, but did not finish this week.';
    const gazetteReason = !manuscript
      ? 'No manuscript reached the editor.'
      : published
        ? 'The Gazette accepted the finished manuscript.'
        : restricted('gazette')
          ? 'The Gazette refused the finished manuscript. Its review rule is harder on women.'
          : 'The Gazette refused the finished manuscript under the same review rule used for everyone.';
    decisions.push({
      id: `week-${turn}-${agent.id}`,
      turn,
      agentId: agent.id,
      exposure: exposureFor(seed, turn, agent, action),
      beliefBefore: previousAgents.find((a) => a.id === agent.id)!.belief,
      beliefAfter: agent.belief,
      schoolChance,
      schoolRoll,
      schoolAccess,
      clinicChance,
      clinicRoll,
      clinicSupported,
      opportunity,
      writingChance,
      writingRoll,
      manuscript,
      editorialChance,
      editorialRoll,
      published,
      reasons: {
        school: schoolReason,
        clinic: clinicReason,
        writing: writingReason,
        gazette: gazetteReason,
      },
    });
    return Object.freeze({
      ...agent,
      agency,
      education,
      opportunities: agent.opportunities + Number(opportunity),
      publications: agent.publications + Number(published),
    });
  });
  return { agents: nextAgents, decisions };
}
export function deriveMetrics(
  snapshot: Pick<TurnSnapshot, 'agents' | 'institutions' | 'decisions'>,
): Metrics {
  const group = (gender: Agent['gender']) => snapshot.agents.filter((a) => a.gender === gender);
  const count = (gender: Agent['gender'], key: 'published' | 'schoolAccess') =>
    group(gender).filter((a) => snapshot.decisions.find((d) => d.agentId === a.id)?.[key]).length;
  const womenPublished = count('woman', 'published');
  const menPublished = count('man', 'published');
  const totalWomen = group('woman').reduce((s, a) => s + a.publications, 0);
  const totalMen = group('man').reduce((s, a) => s + a.publications, 0);
  const endorsers = snapshot.agents.filter((a) => a.belief > 0.2).length;
  return {
    acceptance: endorsers / snapshot.agents.length,
    endorsers,
    restrictions: mean(snapshot.institutions.map((i) => Math.max(0, i.policyBias))),
    accessWomen: count('woman', 'schoolAccess') / 24,
    accessMen: count('man', 'schoolAccess') / 24,
    womenPublished,
    menPublished,
    publicationShare:
      womenPublished + menPublished ? womenPublished / (womenPublished + menPublished) : null,
    totalWomen,
    totalMen,
    cumulativeShare: totalWomen + totalMen ? totalWomen / (totalWomen + totalMen) : null,
  };
}
export function interpretNews(
  agents: readonly Agent[],
  decisions: readonly Decision[],
  institutions: readonly Institution[],
): News {
  const pubs = (gender: Agent['gender']) =>
    agents.filter(
      (a) => a.gender === gender && decisions.find((d) => d.agentId === a.id)?.published,
    ).length;
  const womenCount = pubs('woman');
  const menCount = pubs('man');
  const editor = agents.find(
    (a) => a.id === institutions.find((i) => i.id === 'gazette')!.leaderId,
  )!;
  const observation = `${womenCount} works by women and ${menCount} by men were published this week.`;
  if (womenCount + menCount < 5 || Math.abs(womenCount - menCount) < 2)
    return {
      women: womenCount,
      men: menCount,
      observation,
      frame: 'cautious',
      signal: 0,
      headline: 'This week’s count is not enough to settle it.',
      interpretation: 'The editor does not claim the counts prove a difference in ability.',
    };
  if (editor.belief > 0.15 && menCount > womenCount)
    return {
      women: womenCount,
      men: menCount,
      observation,
      frame: 'hierarchy',
      signal: 0.85,
      headline: 'Men publish more. The editor calls it natural.',
      interpretation:
        'More men were printed. The editor calls that a natural difference, without asking who got a chance to work.',
    };
  const womenSeminars = agents.filter(
    (a) => a.gender === 'woman' && decisions.find((d) => d.agentId === a.id)?.schoolAccess,
  ).length;
  return {
    women: womenCount,
    men: menCount,
    observation,
    frame: 'structural',
    signal: -0.7,
    headline:
      womenCount < menCount
        ? 'Fewer chances. Fewer pieces in print.'
        : 'Women’s work puts the old story in doubt.',
    interpretation: `The editor asks who got a chance to work. ${womenSeminars} of 24 women got a place in class this week. Printed work alone cannot tell us who has ability.`,
  };
}
function freezeSnapshot(snapshot: TurnSnapshot): TurnSnapshot {
  return Object.freeze({
    ...snapshot,
    agents: Object.freeze([...snapshot.agents]),
    institutions: Object.freeze(snapshot.institutions.map((i) => Object.freeze(i))),
    decisions: Object.freeze(
      snapshot.decisions.map((d) => Object.freeze({ ...d, reasons: Object.freeze(d.reasons) })),
    ),
    metrics: Object.freeze(snapshot.metrics),
    news: Object.freeze(snapshot.news),
    message: snapshot.message ? Object.freeze({ ...snapshot.message }) : null,
  });
}
export function initializeWorld(seed = DEFAULT_SEED): GameState {
  if (!Number.isFinite(seed)) throw new Error('Seed must be finite.');
  const institutions: Institution[] = [
    {
      id: 'school',
      name: 'Vesper School',
      leaderId: citizenId(13),
      policyBias: 0.62,
      rule: 'restricted',
    },
    {
      id: 'clinic',
      name: 'The Clinic',
      leaderId: citizenId(5),
      policyBias: 0.66,
      rule: 'restricted',
    },
    {
      id: 'gazette',
      name: 'The Gazette',
      leaderId: citizenId(29),
      policyBias: 0.58,
      rule: 'restricted',
    },
  ];
  // Week zero is a real pre-intervention observation, not a fabricated opening metric.
  const initial = makeDecisions(seed, 0, initializeAgents(seed), institutions, null);
  const base = {
    turn: 0,
    ...initial,
    institutions,
    message: null,
    news: interpretNews(initial.agents, initial.decisions, institutions),
  };
  const snapshot = freezeSnapshot({ ...base, metrics: deriveMetrics(base) });
  return Object.freeze({ seed, turn: 0, snapshots: Object.freeze([snapshot]), isFinished: false });
}
export function stepWorld(state: GameState, action: PlayerAction | null): GameState {
  if (state.isFinished || state.turn >= WEEKS) return state;
  if (
    action &&
    (!['hierarchy', 'equal-agency'].includes(action.narrative) ||
      !['clinic', 'gazette', 'community'].includes(action.channel))
  )
    throw new Error('Invalid broadcast.');
  const previous = state.snapshots[state.snapshots.length - 1];
  const turn = state.turn + 1;
  const beliefs = updateBeliefs(previous, state.seed, turn, action);
  const institutions = updateInstitutions(previous.institutions, beliefs);
  const decisions = makeDecisions(state.seed, turn, beliefs, institutions, action, previous.agents);
  const base = {
    turn,
    ...decisions,
    institutions,
    message: action,
    news: interpretNews(decisions.agents, decisions.decisions, institutions),
  };
  const snapshot = freezeSnapshot({ ...base, metrics: deriveMetrics(base) });
  return Object.freeze({
    ...state,
    turn,
    snapshots: Object.freeze([...state.snapshots, snapshot]),
    isFinished: turn === WEEKS,
  });
}
export function runCounterfactual(seed: number, rounds = WEEKS): GameState {
  let world = initializeWorld(seed);
  for (let i = 0; i < Math.min(WEEKS, Math.max(0, rounds)); i++) world = stepWorld(world, null);
  return world;
}
export const latest = (state: GameState) => state.snapshots[state.snapshots.length - 1];
export function citizenHistory(state: GameState, id: string): readonly Decision[] {
  return state.snapshots
    .filter((s) => s.turn > 0)
    .flatMap((s) => s.decisions.filter((d) => d.agentId === id));
}
export function divergentCitizen(actual: GameState, baseline: GameState): string {
  const agents = latest(actual).agents;
  const ranked = agents
    .map((a) => ({
      id: a.id,
      difference: citizenHistory(actual, a.id).reduce((n, d, i) => {
        const other = citizenHistory(baseline, a.id)[i];
        return (
          n +
          Number(d.published !== other?.published) * 3 +
          Number(d.schoolAccess !== other?.schoolAccess) +
          Number(d.clinicSupported !== other?.clinicSupported)
        );
      }, 0),
    }))
    .sort((a, b) => b.difference - a.difference);
  return ranked[0].id;
}

export type Narrative = 'hierarchy' | 'equal-agency';
export type Channel = 'clinic' | 'gazette' | 'community';
export type InstitutionId = 'school' | 'clinic' | 'gazette';
export type Gender = 'woman' | 'man';
export interface PlayerAction {
  narrative: Narrative;
  channel: Channel;
}
export interface Agent {
  readonly id: string;
  readonly pair: number;
  readonly name: string;
  readonly gender: Gender;
  readonly baseAptitude: number;
  readonly authorityTrust: number;
  readonly susceptibility: number;
  readonly resilience: number;
  readonly peers: readonly string[];
  belief: number;
  agency: number;
  education: number;
  opportunities: number;
  publications: number;
}
export interface Institution {
  id: InstitutionId;
  name: string;
  leaderId: string;
  policyBias: number;
  rule: 'restricted' | 'partial' | 'open';
}
export interface Decision {
  id: string;
  turn: number;
  agentId: string;
  exposure: number;
  beliefBefore: number;
  beliefAfter: number;
  schoolChance: number;
  schoolRoll: number;
  schoolAccess: boolean;
  clinicChance: number;
  clinicRoll: number;
  clinicSupported: boolean;
  opportunity: boolean;
  writingChance: number;
  writingRoll: number;
  manuscript: boolean;
  editorialChance: number;
  editorialRoll: number;
  published: boolean;
  reasons: { school: string; clinic: string; writing: string; gazette: string };
}
export interface News {
  headline: string;
  observation: string;
  interpretation: string;
  frame: 'hierarchy' | 'structural' | 'cautious';
  signal: number;
  women: number;
  men: number;
}
export interface Metrics {
  acceptance: number;
  endorsers: number;
  restrictions: number;
  accessWomen: number;
  accessMen: number;
  womenPublished: number;
  menPublished: number;
  publicationShare: number | null;
  totalWomen: number;
  totalMen: number;
  cumulativeShare: number | null;
}
export interface TurnSnapshot {
  turn: number;
  agents: readonly Agent[];
  institutions: readonly Institution[];
  decisions: readonly Decision[];
  message: PlayerAction | null;
  news: News;
  metrics: Metrics;
}
export interface GameState {
  readonly seed: number;
  turn: number;
  snapshots: readonly TurnSnapshot[];
  isFinished: boolean;
}

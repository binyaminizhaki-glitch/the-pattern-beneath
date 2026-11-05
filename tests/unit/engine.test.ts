import { describe, expect, it } from 'vitest';
import {
  citizenHistory,
  deriveMetrics,
  exposureFor,
  initializeWorld,
  latest,
  makeDecisions,
  runCounterfactual,
  stepWorld,
  updateBeliefs,
  updateInstitutions,
} from '../../src/sim/engine';
import { randomAt } from '../../src/sim/rng';
import type { GameState, Narrative, PlayerAction } from '../../src/sim/types';

function run(seed: number, narrative: Narrative): GameState {
  let world = initializeWorld(seed);
  for (let i = 0; i < 8; i++) world = stepWorld(world, { narrative, channel: 'gazette' });
  return world;
}
describe('persistent controlled population', () => {
  it('has 24 matched pairs, stable peers and identical seeded initialization', () => {
    const world = initializeWorld(42);
    const agents = latest(world).agents;
    expect(initializeWorld(42)).toEqual(world);
    expect(agents.filter((a) => a.gender === 'woman')).toHaveLength(24);
    expect(agents.filter((a) => a.gender === 'man')).toHaveLength(24);
    for (let i = 0; i < 48; i += 2) {
      expect(agents[i].baseAptitude).toBe(agents[i + 1].baseAptitude);
      expect(agents[i].baseAptitude).toBeGreaterThanOrEqual(0.45);
      expect(agents[i].baseAptitude).toBeLessThanOrEqual(0.95);
      expect(new Set(agents[i].peers).size).toBe(4);
      expect(Object.isFrozen(agents[i])).toBe(true);
    }
  });
  it.each([1, 42, 123])(
    'preserves aptitude, identity and graph through arbitrary actions, seed %i',
    (seed) => {
      const initial = initializeWorld(seed);
      let world = initial;
      const original = JSON.stringify(initial);
      for (let i = 0; i < 8; i++) {
        world = stepWorld(world, {
          narrative: i % 2 ? 'hierarchy' : 'equal-agency',
          channel: ['clinic', 'community', 'gazette'][i % 3] as PlayerAction['channel'],
        });
        latest(world).agents.forEach((a, j) => {
          expect(a.baseAptitude).toBe(latest(initial).agents[j].baseAptitude);
          expect(a.peers).toEqual(latest(initial).agents[j].peers);
          expect(a.belief).toBeGreaterThanOrEqual(-1);
          expect(a.belief).toBeLessThanOrEqual(1);
          expect(a.agency).toBeGreaterThanOrEqual(0);
          expect(a.agency).toBeLessThanOrEqual(1);
        });
      }
      expect(JSON.stringify(initial)).toBe(original);
    },
  );
  it('is byte deterministic across complete runs and independent keyed event calls', () => {
    expect(JSON.stringify(run(42, 'equal-agency'))).toBe(JSON.stringify(run(42, 'equal-agency')));
    const draw = randomAt(42, 3, 'citizen-0', 'school');
    randomAt(42, 3, 'citizen-0', 'unrelated-new-event');
    expect(randomAt(42, 3, 'citizen-0', 'school')).toBe(draw);
  });
});
describe('causal transitions', () => {
  it('updates synchronously, independent of population order', () => {
    const prev = latest(initializeWorld(42));
    const action: PlayerAction = { narrative: 'equal-agency', channel: 'gazette' };
    const forward = updateBeliefs(prev, 42, 1, action);
    const backward = updateBeliefs({ ...prev, agents: [...prev.agents].reverse() }, 42, 1, action);
    expect([...backward].sort((a, b) => a.id.localeCompare(b.id))).toEqual(
      [...forward].sort((a, b) => a.id.localeCompare(b.id)),
    );
  });
  it('has differentiated reach, uneven uptake, two-way peers and resistance', () => {
    const previous = latest(initializeWorld(42));
    const exposures = ['clinic', 'gazette', 'community'].map((channel) =>
      previous.agents.map((a) =>
        exposureFor(42, 1, a, {
          narrative: 'hierarchy',
          channel: channel as PlayerAction['channel'],
        }),
      ),
    );
    expect(exposures[0]).not.toEqual(exposures[1]);
    expect(exposures[1]).not.toEqual(exposures[2]);
    expect(exposures[2].filter((e) => e > 0).length).toBeLessThan(25);
    const changed = {
      ...previous,
      agents: previous.agents.map((a) => ({ ...a, belief: a.id === 'citizen-0' ? -1 : 0.5 })),
    };
    const updated = updateBeliefs(changed, 42, 1, null);
    expect(updated.find((a) => a.id === 'citizen-0')!.belief).toBeGreaterThan(-1);
    expect(updated.find((a) => a.id === 'citizen-1')!.belief).toBeLessThan(0.5);
    expect(
      new Set(
        updateBeliefs(previous, 42, 1, { narrative: 'equal-agency', channel: 'gazette' }).map(
          (a) => a.belief,
        ),
      ).size,
    ).toBeGreaterThan(30);
  });
  it('retains policy inertia and prior immutable snapshots', () => {
    const previous = latest(initializeWorld(42));
    const changed = updateInstitutions(
      previous.institutions,
      previous.agents.map((a) => ({ ...a, belief: -1 })),
    );
    changed.forEach((institution, i) => {
      expect(institution.policyBias).toBeCloseTo(0.75 * previous.institutions[i].policyBias - 0.25);
      expect(institution.policyBias).toBeGreaterThan(-1);
    });
  });
  it('restrictions change access under the same random draws, then manuscripts and publications', () => {
    const snapshot = latest(initializeWorld(42));
    const open = makeDecisions(
      42,
      2,
      snapshot.agents,
      snapshot.institutions.map((i) => ({ ...i, policyBias: 0 })),
      null,
    );
    const closed = makeDecisions(
      42,
      2,
      snapshot.agents,
      snapshot.institutions.map((i) => ({ ...i, policyBias: 1 })),
      null,
    );
    const female = (id: string) => snapshot.agents.find((a) => a.id === id)!.gender === 'woman';
    expect(
      open.decisions.filter((d) => female(d.agentId) && d.schoolAccess).length,
    ).toBeGreaterThan(closed.decisions.filter((d) => female(d.agentId) && d.schoolAccess).length);
    expect(open.decisions.filter((d) => female(d.agentId) && d.published).length).toBeGreaterThan(
      closed.decisions.filter((d) => female(d.agentId) && d.published).length,
    );
    open.decisions.forEach((d, i) => expect(d.schoolRoll).toBe(closed.decisions[i].schoolRoll));
    closed.decisions
      .filter((d) => !female(d.agentId))
      .forEach((d) => expect(d).toEqual(open.decisions.find((x) => x.agentId === d.agentId)));
  });
  it('every publication has access, a manuscript and a successful recorded draw', () => {
    const world = run(42, 'equal-agency');
    for (const snapshot of world.snapshots)
      for (const d of snapshot.decisions) {
        expect(d.published).toBe(d.manuscript && d.editorialRoll < d.editorialChance);
        if (d.published) {
          expect(d.opportunity).toBe(true);
          expect(d.manuscript).toBe(true);
          expect(d.writingRoll).toBeLessThan(d.writingChance);
        }
        for (const key of [
          'schoolChance',
          'clinicChance',
          'writingChance',
          'editorialChance',
        ] as const) {
          expect(d[key]).toBeGreaterThanOrEqual(0);
          expect(d[key]).toBeLessThanOrEqual(1);
        }
      }
  });
  it('news counts actual outcomes and feeds beliefs only on the following turn', () => {
    const previous = initializeWorld(42);
    const next = stepWorld(previous, null);
    const snapshot = latest(next);
    const expectedBeliefs = updateBeliefs(latest(previous), 42, 1, null);
    expect(snapshot.agents.map((a) => a.belief)).toEqual(expectedBeliefs.map((a) => a.belief));
    expect(snapshot.news.women).toBe(snapshot.metrics.womenPublished);
    expect(snapshot.news.men).toBe(snapshot.metrics.menPublished);
    const positive = { ...snapshot, news: { ...snapshot.news, signal: 1 } };
    const negative = { ...snapshot, news: { ...snapshot.news, signal: -1 } };
    expect(updateBeliefs(positive, 42, 2, null)[0].belief).toBeGreaterThan(
      updateBeliefs(negative, 42, 2, null)[0].belief,
    );
    expect(snapshot.agents).toEqual(latest(next).agents);
  });
  it('zero publications have no fabricated share or NaN', () => {
    const snapshot = latest(initializeWorld(1));
    const metrics = deriveMetrics({
      ...snapshot,
      agents: snapshot.agents.map((a) => ({ ...a, publications: 0 })),
      decisions: snapshot.decisions.map((d) => ({ ...d, published: false })),
    });
    expect(metrics.publicationShare).toBeNull();
    expect(metrics.cumulativeShare).toBeNull();
    expect(Object.values(metrics).some((v) => Number.isNaN(v))).toBe(false);
  });
});
describe('eight week comparisons', () => {
  it.each([1, 42, 123])(
    'opposed strategies produce material causal differences for seed %i',
    (seed) => {
      const hierarchy = latest(run(seed, 'hierarchy'));
      const agency = latest(run(seed, 'equal-agency'));
      expect(hierarchy.metrics.acceptance - agency.metrics.acceptance).toBeGreaterThan(0.3);
      expect(hierarchy.metrics.restrictions - agency.metrics.restrictions).toBeGreaterThan(0.2);
      expect(agency.metrics.totalWomen - hierarchy.metrics.totalWomen).toBeGreaterThan(8);
    },
  );
  it('passive counterfactual exactly reproduces eight manual quiet weeks and fixed draws', () => {
    let manual = initializeWorld(42);
    for (let i = 0; i < 8; i++) manual = stepWorld(manual, null);
    const baseline = runCounterfactual(42);
    expect(baseline).toEqual(manual);
    const played = run(42, 'equal-agency');
    played.snapshots.forEach((snapshot, i) =>
      snapshot.decisions.forEach((d, j) => {
        const other = baseline.snapshots[i].decisions[j];
        for (const key of ['schoolRoll', 'clinicRoll', 'writingRoll', 'editorialRoll'] as const)
          expect(d[key]).toBe(other[key]);
      }),
    );
    expect(citizenHistory(played, 'citizen-0')).toHaveLength(8);
  });
  it('finishes at eight, rejects invalid actions and never advances a finished world', () => {
    const world = run(42, 'hierarchy');
    expect(world.isFinished).toBe(true);
    expect(world.turn).toBe(8);
    expect(world.snapshots).toHaveLength(9);
    expect(stepWorld(world, null)).toBe(world);
    expect(() => initializeWorld(NaN)).toThrow();
    expect(() =>
      stepWorld(initializeWorld(1), {
        narrative: 'fake',
        channel: 'clinic',
      } as unknown as PlayerAction),
    ).toThrow();
  });
});

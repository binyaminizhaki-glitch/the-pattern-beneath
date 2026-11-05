import { expect, it } from 'vitest';
import { initializeWorld, latest, stepWorld } from '../../src/sim/engine';
import { PHASES, projectTransition, visualEvents } from '../../src/presentation/causality';
it('projects real data in causal order and never reveals future metrics early', () => {
  const world = initializeWorld(42),
    from = latest(world),
    to = latest(stepWorld(world, { narrative: 'equal-agency', channel: 'gazette' }));
  expect(PHASES.reduce((n, p) => n + p.duration, 0)).toBe(4200);
  expect(projectTransition(from, to, 1).agents).toBe(from.agents);
  expect(projectTransition(from, to, 2).agents.map((a) => a.belief)).toEqual(
    to.agents.map((a) => a.belief),
  );
  expect(projectTransition(from, to, 2).agents.map((a) => a.agency)).toEqual(
    from.agents.map((a) => a.agency),
  );
  expect(projectTransition(from, to, 4).agents.map((a) => a.publications)).toEqual(
    from.agents.map((a) => a.publications),
  );
  expect(projectTransition(from, to, 5).agents).toBe(to.agents);
  expect(projectTransition(from, to, 2).institutions).toBe(from.institutions);
  expect(projectTransition(from, to, 3).institutions).toBe(to.institutions);
  expect(projectTransition(from, to, 4).metrics).toBe(from.metrics);
  expect(projectTransition(from, to, 5).metrics).toBe(to.metrics);
  expect(projectTransition(from, to, 5).news).toBe(from.news);
  expect(projectTransition(from, to, 6).news).toBe(to.news);
});
it('every named visual event is supported by the corresponding citizen record', () => {
  const world = initializeWorld(42),
    from = latest(world),
    to = latest(stepWorld(world, { narrative: 'equal-agency', channel: 'gazette' }));
  for (const event of visualEvents(from, to)) {
    if (!event.agentId) continue;
    const d = to.decisions.find((d) => d.agentId === event.agentId)!;
    if (event.kind === 'denial') expect(d.schoolAccess).toBe(false);
    if (event.kind === 'publication') expect(d.published).toBe(true);
    if (event.text.includes('writing support')) expect(d.clinicSupported).toBe(true);
    if (event.text.includes('gained seminar')) expect(d.schoolAccess).toBe(true);
  }
});

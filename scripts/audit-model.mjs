import fs from 'node:fs';
import { createServer } from 'vite';
const server = await createServer({
  configFile: false,
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true },
  logLevel: 'error',
});
try {
  const { initializeWorld, stepWorld, latest, runCounterfactual } =
    await server.ssrLoadModule('/src/sim/engine.ts');
  const rows = [];
  for (const seed of [1, 42, 123])
    for (const strategy of ['hierarchy', 'equal-agency', 'passive']) {
      let world = initializeWorld(seed);
      const initial = latest(world);
      for (let i = 0; i < 8; i++)
        world = stepWorld(
          world,
          strategy === 'passive' ? null : { narrative: strategy, channel: 'gazette' },
        );
      const final = latest(world);
      rows.push({
        seed,
        strategy,
        endorsement: `${Math.round(final.metrics.acceptance * 100)}%`,
        restriction: `${Math.round(final.metrics.restrictions * 100)}%`,
        womenWorks: final.metrics.totalWomen - initial.metrics.totalWomen,
        menWorks: final.metrics.totalMen - initial.metrics.totalMen,
        aptitudeUnchanged: final.agents.every(
          (a, i) => a.baseAptitude === initial.agents[i].baseAptitude,
        ),
        passiveReplayIdentical:
          strategy === 'passive'
            ? JSON.stringify(world) === JSON.stringify(runCounterfactual(seed))
            : null,
      });
    }
  fs.mkdirSync('output', { recursive: true });
  fs.writeFileSync('output/model-audit.json', JSON.stringify(rows, null, 2) + '\n');
  console.table(rows);
} finally {
  await server.close();
}

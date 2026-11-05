import { expect, it } from 'vitest';
import { sceneReducer, type SceneState } from '../../src/narrative/scenes';
import { citizenDialogue, dialogueChoices, recordCaption } from '../../src/narrative/story';
import { initializeWorld, latest, stepWorld } from '../../src/sim/engine';
import { inspectRoom, openRoom, peelRoom, roomComplete } from '../../src/narrative/room';
function finishRoom(scene: SceneState): SceneState {
  expect(scene.kind).toBe('ROOM');
  for (const object of ['desk', 'door', 'wall'] as const)
    scene = sceneReducer(scene, { type: 'ROOM_INSPECT', object });
  for (const strip of [0, 1, 2]) scene = sceneReducer(scene, { type: 'ROOM_STRIP', strip });
  return sceneReducer(scene, { type: 'ROOM_CONTINUE' });
}
it('covers every story scene and selected weekly encounters without changing the world', () => {
  let scene: SceneState = { kind: 'TITLE' };
  scene = sceneReducer(scene, { type: 'ENTER_STORY' });
  scene = finishRoom(scene);
  expect(scene.kind).toBe('PROLOGUE');
  scene = sceneReducer(scene, { type: 'NEXT_PROLOGUE' });
  scene = sceneReducer(scene, { type: 'NEXT_PROLOGUE' });
  expect(scene.kind).toBe('CHARACTER_ENCOUNTER');
  scene = sceneReducer(scene, { type: 'CONTINUE' });
  for (let week = 1; week <= 8; week++) {
    scene = sceneReducer(scene, { type: 'RELEASE' });
    expect(scene.kind).toBe('SIMULATION_CONSEQUENCE');
    scene = sceneReducer(scene, { type: 'ROUND_COMPLETE', week });
    if ([1, 2, 3, 5, 6, 7].includes(week)) {
      expect(scene.kind).toBe('CHARACTER_ENCOUNTER');
      if (scene.kind === 'CHARACTER_ENCOUNTER')
        expect(scene.actorId).toBe(
          week === 1 || week === 6 ? 'citizen-5' : week === 3 ? 'citizen-29' : 'citizen-0',
        );
      scene = sceneReducer(scene, { type: 'CONTINUE' });
      if ([2, 6].includes(week)) scene = finishRoom(scene);
    }
    if (week === 4) {
      expect(scene.kind).toBe('STORY_TURNING_POINT');
      scene = sceneReducer(scene, { type: 'CONTINUE' });
      scene = finishRoom(scene);
    }
  }
  expect(scene.kind).toBe('COUNTERFACTUAL_REVEAL');
  scene = sceneReducer(scene, { type: 'UNRAVEL' });
  expect(scene.kind).toBe('PATTERN_REVEAL');
  scene = sceneReducer(scene, { type: 'EPILOGUE' });
  scene = finishRoom(scene);
  expect(scene.kind).toBe('LITERARY_EPILOGUE');
  expect(sceneReducer(scene, { type: 'REVIEW' }).kind).toBe('COUNTERFACTUAL_REVEAL');
});
it('dialogue describes the actual opening record and adapts to opposed runs', () => {
  const world = initializeWorld(42);
  const before = JSON.stringify(world);
  const s = latest(world);
  expect(citizenDialogue(s, 'citizen-0', 'situation')).toContain('Finished, and declined');
  expect(recordCaption(s)).toContain('Class: admitted');
  expect(citizenDialogue(s, 'citizen-0', 'rules')).toContain('would not recommend writing time');
  for (const topic of ['situation', 'ambition', 'rules', 'work'] as const)
    citizenDialogue(s, 'citizen-0', topic);
  expect(JSON.stringify(world)).toBe(before);
  let inclusive = world,
    restrictive = world;
  for (let i = 0; i < 8; i++) {
    inclusive = stepWorld(inclusive, { narrative: 'equal-agency', channel: 'gazette' });
    restrictive = stepWorld(restrictive, { narrative: 'hierarchy', channel: 'gazette' });
  }
  expect(citizenDialogue(latest(inclusive), 'citizen-0', 'rules')).not.toBe(
    citizenDialogue(latest(restrictive), 'citizen-0', 'rules'),
  );
});
it('the room requires its actual actions, keeps prior readings intact and resets on replay', () => {
  const initial = openRoom(4),
    before = JSON.stringify(initial);
  expect(roomComplete(initial)).toBe(false);
  const door = inspectRoom(initial, 'door');
  expect(roomComplete(door)).toBe(false);
  const first = peelRoom(door, 0);
  expect(peelRoom(first, 0)).toEqual(first);
  expect(roomComplete(first)).toBe(false);
  const done = peelRoom(peelRoom(first, 1), 2);
  expect(roomComplete(done)).toBe(true);
  expect(JSON.stringify(initial)).toBe(before);
  expect(peelRoom(initial, 3)).toBe(initial);
  expect(peelRoom(openRoom(0), 1).strips).toBe(0);
  const scene: SceneState = { kind: 'ROOM', reading: initial };
  expect(sceneReducer(scene, { type: 'ROOM_CONTINUE' })).toBe(scene);
  const restart = sceneReducer({ kind: 'ROOM', reading: done }, { type: 'RESTART', cover: true });
  expect(sceneReducer(restart, { type: 'ENTER_STORY' })).toEqual({
    kind: 'ROOM',
    reading: openRoom(0),
  });
});
it('recurring institutional voices use actual rules, output counts and their distinct motives', () => {
  const snapshot = latest(initializeWorld(42));
  const clinic = snapshot.institutions.find((institution) => institution.id === 'clinic')!;
  const gazette = snapshot.institutions.find((institution) => institution.id === 'gazette')!;
  expect(citizenDialogue(snapshot, clinic.leaderId, 'evidence')).toContain(
    `time for ${snapshot.decisions.filter((decision) => decision.clinicSupported).length} of the town’s 48`,
  );
  expect(citizenDialogue(snapshot, clinic.leaderId, 'work')).toContain(
    'did not recommend writing time for Mrs Vale',
  );
  expect(citizenDialogue(snapshot, gazette.leaderId, 'evidence')).toContain(
    `printed ${snapshot.news.women} works by women and ${snapshot.news.men} by men`,
  );
  expect(citizenDialogue(snapshot, clinic.leaderId, 'ambition')).toContain('answer to the family');
  expect(citizenDialogue(snapshot, gazette.leaderId, 'ambition')).toContain('paper, the wages');
});
it('all conversational branches are reachable and reading them cannot mutate any simulated record', () => {
  for (const narrative of ['hierarchy', 'equal-agency'] as const) {
    let world = initializeWorld(42);
    for (let week = 0; week <= 8; week++) {
      const snapshot = latest(world),
        before = JSON.stringify(snapshot);
      for (const actor of snapshot.agents) {
        const visited = new Set<string>(),
          queue = ['situation'] as import('../../src/narrative/scenes').DialogueTopic[];
        while (queue.length) {
          const topic = queue.shift()!;
          if (visited.has(topic)) continue;
          visited.add(topic);
          expect(citizenDialogue(snapshot, actor.id, topic).length).toBeGreaterThan(30);
          for (const choice of dialogueChoices(snapshot, actor.id, topic)) {
            expect(choice.topic).not.toBe(topic);
            queue.push(choice.topic);
          }
        }
        expect(visited.size).toBe(6);
      }
      expect(JSON.stringify(snapshot)).toBe(before);
      if (week < 8) world = stepWorld(world, { narrative, channel: 'gazette' });
    }
  }
});
it('a spoken challenge is retained for context and a fresh encounter clears it', () => {
  let scene: SceneState = {
    kind: 'CHARACTER_ENCOUNTER',
    actorId: 'citizen-5',
    topic: 'situation',
    resume: 'TOWN_GAMEPLAY',
    automatic: false,
  };
  scene = sceneReducer(scene, {
    type: 'ASK',
    topic: 'challenge',
    line: 'Does the same caution apply to men?',
  });
  expect(scene).toMatchObject({
    topic: 'challenge',
    playerLine: 'Does the same caution apply to men?',
  });
  scene = sceneReducer(scene, { type: 'ENCOUNTER', actorId: 'citizen-0', resume: 'TOWN_GAMEPLAY' });
  expect(scene).not.toHaveProperty('playerLine');
});

import { expect, it } from 'vitest';
import { filmReducer, INTRO_BEATS, type FilmScene } from '../../src/narrative/film';

it('plays the opening into eight uninterrupted turns, comparison and the room', () => {
  let scene: FilmScene = { kind: 'TITLE' };
  scene = filmReducer(scene, { type: 'START' });
  for (let beat = 0; beat < INTRO_BEATS.length; beat++) {
    expect(scene).toMatchObject({ kind: 'CINEMATIC_INTRO', beat });
    scene = filmReducer(scene, { type: 'NEXT_BEAT' });
  }
  for (let week = 1; week <= 8; week++) {
    expect(scene.kind).toBe('TOWN_GAMEPLAY');
    scene = filmReducer(scene, { type: 'PLAY_WEEK' });
    for (let phase = 0; phase < 7; phase++) {
      expect(scene).toEqual({ kind: 'SIMULATION_CONSEQUENCE', phase });
      scene = filmReducer(scene, { type: 'NEXT_PHASE' });
    }
    scene = filmReducer(scene, { type: 'WEEK_COMPLETE', week });
  }
  expect(scene.kind).toBe('COUNTERFACTUAL_REVEAL');
  scene = filmReducer(scene, { type: 'FINISH' });
  expect(scene.kind).toBe('LITERARY_EPILOGUE');
  expect(filmReducer(scene, { type: 'REVIEW' }).kind).toBe('COUNTERFACTUAL_REVEAL');
});

it('pausing and duplicate input cannot bypass a shot or start another turn', () => {
  const opening: FilmScene = { kind: 'CINEMATIC_INTRO', beat: 2, paused: true };
  expect(filmReducer(opening, { type: 'NEXT_BEAT' })).toBe(opening);
  expect(filmReducer(opening, { type: 'PLAY_WEEK' })).toBe(opening);
  const resumed = filmReducer(opening, { type: 'TOGGLE_PAUSE' });
  expect(filmReducer(resumed, { type: 'NEXT_BEAT' })).toMatchObject({ beat: 3 });
  const playing: FilmScene = { kind: 'SIMULATION_CONSEQUENCE', phase: 1 };
  expect(filmReducer(playing, { type: 'PLAY_WEEK' })).toBe(playing);
  const town = filmReducer(playing, { type: 'WEEK_COMPLETE', week: 2 });
  expect(filmReducer(town, { type: 'WEEK_COMPLETE', week: 2 })).toBe(town);
});

it('restart and intro skip ignore obsolete timer events without mutating prior scenes', () => {
  const original: FilmScene = { kind: 'CINEMATIC_INTRO', beat: 1, paused: false };
  const copy = JSON.stringify(original);
  const skipped = filmReducer(original, { type: 'SKIP_INTRO' });
  expect(filmReducer(skipped, { type: 'NEXT_BEAT' })).toBe(skipped);
  const reset = filmReducer(skipped, { type: 'RESTART' });
  expect(filmReducer(reset, { type: 'NEXT_PHASE' })).toBe(reset);
  expect(filmReducer(reset, { type: 'WEEK_COMPLETE', week: 8 })).toBe(reset);
  expect(JSON.stringify(original)).toBe(copy);
  expect(INTRO_BEATS.reduce((total, beat) => total + beat.duration, 0)).toBe(31000);
});

import { passages, STORY_PDF } from './room';

export interface FilmBeat {
  readonly id: string;
  readonly image: 'bedroom' | 'wallpaper' | 'town';
  readonly duration: number;
  readonly text: string;
  readonly page?: number;
  readonly speaker?: string;
}

// Original wording, checked visually against the NLM 1892 facsimile.
export const INTRO_BEATS: readonly FilmBeat[] = [
  {
    id: 'work',
    image: 'bedroom',
    duration: 7000,
    text: 'Personally, I believe that congenial work, with excitement and change, would do me good.',
    page: 648,
    speaker: 'The narrator',
  },
  {
    id: 'writing',
    image: 'bedroom',
    duration: 8000,
    text: 'There comes John, and I must put this away,—he hates to have me write a word.',
    page: 649,
    speaker: 'The narrator',
  },
  {
    id: 'authority',
    image: 'bedroom',
    duration: 6000,
    ...passages.authority,
    speaker: 'John',
  },
  {
    id: 'woman',
    image: 'wallpaper',
    duration: 6000,
    ...passages.woman,
    speaker: 'The narrator',
  },
  {
    id: 'town',
    image: 'town',
    duration: 4000,
    text: 'In this imagined town, a message can change who gets a chance.',
  },
];

export const ENDING_QUOTE = {
  text: "And I've pulled off most of the paper, so you can't put me back!",
  page: 656,
} as const;

export const quoteSource = (page: number) => `${STORY_PDF}#page=${page - 646}`;

export type FilmScene =
  | { kind: 'TITLE' }
  | { kind: 'CINEMATIC_INTRO'; beat: number; paused: boolean }
  | { kind: 'TOWN_GAMEPLAY' }
  | { kind: 'SIMULATION_CONSEQUENCE'; phase: number }
  | { kind: 'COUNTERFACTUAL_REVEAL' }
  | { kind: 'LITERARY_EPILOGUE' };

export type FilmAction =
  | { type: 'START' }
  | { type: 'NEXT_BEAT' }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'SKIP_INTRO' }
  | { type: 'PLAY_WEEK' }
  | { type: 'NEXT_PHASE' }
  | { type: 'WEEK_COMPLETE'; week: number }
  | { type: 'FINISH' }
  | { type: 'REVIEW' }
  | { type: 'RESTART' };

export function filmReducer(scene: FilmScene, action: FilmAction): FilmScene {
  switch (action.type) {
    case 'START':
      return scene.kind === 'TITLE' ? { kind: 'CINEMATIC_INTRO', beat: 0, paused: false } : scene;
    case 'NEXT_BEAT':
      return scene.kind !== 'CINEMATIC_INTRO' || scene.paused
        ? scene
        : scene.beat + 1 === INTRO_BEATS.length
          ? { kind: 'TOWN_GAMEPLAY' }
          : { ...scene, beat: scene.beat + 1 };
    case 'TOGGLE_PAUSE':
      return scene.kind === 'CINEMATIC_INTRO' ? { ...scene, paused: !scene.paused } : scene;
    case 'SKIP_INTRO':
      return scene.kind === 'CINEMATIC_INTRO' ? { kind: 'TOWN_GAMEPLAY' } : scene;
    case 'PLAY_WEEK':
      return scene.kind === 'TOWN_GAMEPLAY' ? { kind: 'SIMULATION_CONSEQUENCE', phase: 0 } : scene;
    case 'NEXT_PHASE':
      return scene.kind === 'SIMULATION_CONSEQUENCE' && scene.phase < 6
        ? { ...scene, phase: scene.phase + 1 }
        : scene;
    case 'WEEK_COMPLETE':
      return scene.kind !== 'SIMULATION_CONSEQUENCE'
        ? scene
        : { kind: action.week === 8 ? 'COUNTERFACTUAL_REVEAL' : 'TOWN_GAMEPLAY' };
    case 'FINISH':
      return scene.kind === 'COUNTERFACTUAL_REVEAL' ? { kind: 'LITERARY_EPILOGUE' } : scene;
    case 'REVIEW':
      return scene.kind === 'LITERARY_EPILOGUE' ? { kind: 'COUNTERFACTUAL_REVEAL' } : scene;
    case 'RESTART':
      return { kind: 'TITLE' };
  }
}

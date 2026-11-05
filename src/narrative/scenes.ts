import {
  inspectRoom,
  openRoom,
  peelRoom,
  roomComplete,
  type RoomObject,
  type RoomReading,
} from './room';

export type DialogueTopic = 'situation' | 'ambition' | 'rules' | 'work' | 'challenge' | 'evidence';
export type SceneKind =
  | 'TITLE'
  | 'ROOM'
  | 'PROLOGUE'
  | 'CHARACTER_ENCOUNTER'
  | 'TOWN_GAMEPLAY'
  | 'SIMULATION_CONSEQUENCE'
  | 'STORY_TURNING_POINT'
  | 'COUNTERFACTUAL_REVEAL'
  | 'PATTERN_REVEAL'
  | 'LITERARY_EPILOGUE';
type Resume = 'TOWN_GAMEPLAY' | 'COUNTERFACTUAL_REVEAL';
export type SceneState =
  | {
      kind:
        | 'TITLE'
        | 'TOWN_GAMEPLAY'
        | 'SIMULATION_CONSEQUENCE'
        | 'STORY_TURNING_POINT'
        | 'COUNTERFACTUAL_REVEAL'
        | 'PATTERN_REVEAL'
        | 'LITERARY_EPILOGUE';
    }
  | { kind: 'PROLOGUE'; beat: 0 | 1 }
  | { kind: 'ROOM'; reading: RoomReading }
  | {
      kind: 'CHARACTER_ENCOUNTER';
      actorId: string;
      topic: DialogueTopic;
      playerLine?: string;
      resume: Resume;
      automatic: boolean;
      roomAfter?: 1 | 3;
    };
export type SceneAction =
  | { type: 'ENTER_STORY' }
  | { type: 'ROOM_INSPECT'; object: RoomObject }
  | { type: 'ROOM_STRIP'; strip: number }
  | { type: 'ROOM_CONTINUE' }
  | { type: 'NEXT_PROLOGUE' }
  | { type: 'RELEASE' }
  | { type: 'ROUND_COMPLETE'; week: number }
  | { type: 'ASK'; topic: DialogueTopic; line?: string }
  | { type: 'ENCOUNTER'; actorId: string; resume: Resume }
  | { type: 'CONTINUE' }
  | { type: 'EPILOGUE' }
  | { type: 'UNRAVEL' }
  | { type: 'REVIEW' }
  | { type: 'RESTART'; cover: boolean };
export function sceneReducer(scene: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'ENTER_STORY':
      return scene.kind === 'TITLE' ? { kind: 'ROOM', reading: openRoom(0) } : scene;
    case 'ROOM_INSPECT':
      return scene.kind === 'ROOM'
        ? { ...scene, reading: inspectRoom(scene.reading, action.object) }
        : scene;
    case 'ROOM_STRIP':
      return scene.kind === 'ROOM'
        ? { ...scene, reading: peelRoom(scene.reading, action.strip) }
        : scene;
    case 'ROOM_CONTINUE':
      if (scene.kind !== 'ROOM' || !roomComplete(scene.reading)) return scene;
      return scene.reading.chapter === 0
        ? { kind: 'PROLOGUE', beat: 0 }
        : scene.reading.chapter === 4
          ? { kind: 'LITERARY_EPILOGUE' }
          : { kind: 'TOWN_GAMEPLAY' };
    case 'NEXT_PROLOGUE':
      return scene.kind === 'PROLOGUE'
        ? scene.beat === 0
          ? { kind: 'PROLOGUE', beat: 1 }
          : {
              kind: 'CHARACTER_ENCOUNTER',
              actorId: 'citizen-0',
              topic: 'situation',
              resume: 'TOWN_GAMEPLAY',
              automatic: true,
            }
        : scene;
    case 'RELEASE':
      return scene.kind === 'TOWN_GAMEPLAY' ? { kind: 'SIMULATION_CONSEQUENCE' } : scene;
    case 'ROUND_COMPLETE':
      if (scene.kind !== 'SIMULATION_CONSEQUENCE') return scene;
      return action.week === 8
        ? { kind: 'COUNTERFACTUAL_REVEAL' }
        : action.week === 4
          ? { kind: 'STORY_TURNING_POINT' }
          : [1, 2, 3, 5, 6, 7].includes(action.week)
            ? {
                kind: 'CHARACTER_ENCOUNTER',
                actorId:
                  action.week === 1 || action.week === 6
                    ? 'citizen-5'
                    : action.week === 3
                      ? 'citizen-29'
                      : 'citizen-0',
                topic: 'situation',
                resume: 'TOWN_GAMEPLAY',
                automatic: true,
                ...(action.week === 2
                  ? { roomAfter: 1 as const }
                  : action.week === 6
                    ? { roomAfter: 3 as const }
                    : {}),
              }
            : { kind: 'TOWN_GAMEPLAY' };
    case 'ASK':
      return scene.kind === 'CHARACTER_ENCOUNTER'
        ? { ...scene, topic: action.topic, playerLine: action.line }
        : scene;
    case 'ENCOUNTER':
      return {
        kind: 'CHARACTER_ENCOUNTER',
        actorId: action.actorId,
        topic: 'situation',
        resume: action.resume,
        automatic: false,
      };
    case 'CONTINUE':
      return scene.kind === 'CHARACTER_ENCOUNTER'
        ? scene.roomAfter !== undefined
          ? { kind: 'ROOM', reading: openRoom(scene.roomAfter) }
          : { kind: scene.resume }
        : scene.kind === 'STORY_TURNING_POINT'
          ? { kind: 'ROOM', reading: openRoom(2) }
          : scene;
    case 'EPILOGUE':
      return scene.kind === 'COUNTERFACTUAL_REVEAL' || scene.kind === 'PATTERN_REVEAL'
        ? { kind: 'ROOM', reading: openRoom(4) }
        : scene;
    case 'UNRAVEL':
      return scene.kind === 'COUNTERFACTUAL_REVEAL' ? { kind: 'PATTERN_REVEAL' } : scene;
    case 'REVIEW':
      return { kind: 'COUNTERFACTUAL_REVEAL' };
    case 'RESTART':
      return { kind: action.cover ? 'TITLE' : 'TOWN_GAMEPLAY' };
  }
}
export function actForWeek(week: number) {
  return week <= 2
    ? 'Act I · Everyone knows'
    : week <= 5
      ? 'Act II · Who gets a chance?'
      : 'Act III · Look at the results';
}

export type RoomChapter = 0 | 1 | 2 | 3 | 4;
export type RoomObject = 'desk' | 'door' | 'wall';
export interface RoomReading {
  chapter: RoomChapter;
  selected: RoomObject | null;
  visited: readonly RoomObject[];
  strips: number;
}

export const STORY_PDF = `${import.meta.env.BASE_URL}sources/the-yellow-wall-paper-1892.pdf`;
export const ORIGINAL_PDF =
  'https://www.nlm.nih.gov/exhibition/theliteratureofprescription/exhibitionAssets/digitalDocs/The-Yellow-Wall-Paper.pdf';

// Exact passages checked against the printed pages of the January 1892 edition.
// The original narrator is distinct from Clara, who belongs to the invented town.
export const passages = {
  voice: { text: 'Personally, I disagree with their ideas.', page: 648 },
  writing: { text: 'he hates to have me write a word.', page: 649 },
  silence: { text: 'So of course I said no more on that score,', page: 653 },
  authority: { text: 'I am a doctor, dear, and I know.', page: 652 },
  woman: { text: 'now I am quite sure it is a woman.', page: 653 },
  bars: { text: 'it becomes bars!', page: 653 },
  ending: { text: "I've got out at last,", page: 656 },
} as const;
export type PassageId = keyof typeof passages;

export const roomChapters = [
  {
    title: 'A page of your own.',
    time: 'The first day',
    lead: 'You want to write. John says you need rest. Your notebook is still on the desk.',
    instruction: 'Choose something in the room.',
    next: 'Hide the page. Look outside.',
    required: 'desk',
    quote: 'voice',
    labels: { desk: 'Write a line', door: 'Ask for another room', wall: 'Look at the wallpaper' },
    responses: {
      desk: 'You write what you cannot say to him. Footsteps on the stairs. The page has to go away.',
      door: 'You ask for the room downstairs. John decides that this room is better for you.',
      wall: 'An ugly yellow pattern. You would rather be writing.',
    },
  },
  {
    title: 'He has an answer.',
    time: 'Later',
    lead: 'You tell John you are not getting better. He says you are. He gets to decide what happens next.',
    instruction: 'Try to change the day.',
    next: 'Stay in the room.',
    required: 'door',
    quote: 'authority',
    labels: { desk: 'Try to write', door: 'Ask to leave', wall: 'Turn to the wall' },
    responses: {
      desk: 'You can still write, but only in secret. Hiding it makes the work harder.',
      door: 'You ask to leave. John says the lease has three weeks left. You stay.',
      wall: 'Nothing else asks for your attention. You begin to follow the pattern.',
    },
  },
  {
    title: 'Nothing to do but look.',
    time: 'By the window',
    lead: 'Your work stays hidden. Hours pass. The pattern starts to look like something behind something else.',
    instruction: 'Look at the three loose edges.',
    next: 'Leave the pattern for now.',
    required: 'wall',
    quote: 'silence',
    labels: { desk: 'Find the notebook', door: 'Call for company', wall: 'Follow the pattern' },
    responses: {
      desk: 'A few private lines. No one to read them with you.',
      door: 'John has put off the visit. He thinks company would tire you.',
      wall: 'At first, only a shape. Then a head, a shoulder, a woman bent low. You keep looking.',
    },
  },
  {
    title: 'Someone behind it.',
    time: 'By moonlight',
    lead: 'You are certain there is a woman behind the paper. John sees you lying quietly. He thinks the rest is working.',
    instruction: 'Look at what the pattern has become.',
    next: 'Keep this to yourself.',
    required: 'wall',
    quote: 'woman',
    labels: { desk: 'Look for your work', door: 'Listen for John', wall: 'Look behind the bars' },
    responses: {
      desk: 'The notebook is still there. The woman takes up more of your attention now.',
      door: 'You hear John outside. You no longer tell him what you see.',
      wall: 'She shakes the pattern. To you, it is a cage. You want to get her out.',
    },
  },
  {
    title: 'The last day.',
    time: 'Before they leave',
    lead: 'You lock the door. They leave today. The woman is still behind the pattern. You want to get her out.',
    instruction: 'Pull away each of the three strips.',
    next: 'Follow her around the room.',
    required: 'wall',
    quote: 'ending',
    labels: {
      desk: 'Leave the notebook',
      door: 'Hear John at the door',
      wall: 'Pull at the paper',
    },
    responses: {
      desk: 'You leave the notebook. You have work to do at the wall.',
      door: 'John calls from outside. This time, you are the one who has locked the door.',
      wall: 'The paper comes away. You keep circling the room. John comes in and faints across your path. You creep over him.',
    },
  },
] as const;

export function openRoom(chapter: RoomChapter): RoomReading {
  return { chapter, selected: null, visited: [], strips: 0 };
}

export function inspectRoom(reading: RoomReading, object: RoomObject): RoomReading {
  return {
    ...reading,
    selected: object,
    visited: reading.visited.includes(object) ? reading.visited : [...reading.visited, object],
  };
}

export function peelRoom(reading: RoomReading, strip: number): RoomReading {
  if (![2, 4].includes(reading.chapter) || !Number.isInteger(strip) || strip < 0 || strip > 2)
    return reading;
  return { ...inspectRoom(reading, 'wall'), strips: reading.strips | (1 << strip) };
}

export function roomComplete(reading: RoomReading): boolean {
  return (
    reading.visited.includes(roomChapters[reading.chapter].required) &&
    (![2, 4].includes(reading.chapter) || reading.strips === 7)
  );
}

import { ArrowRight, DoorClosed, PenLine, ScanLine } from 'lucide-react';
import { roomChapters, roomComplete, type RoomObject, type RoomReading } from '../narrative/room';
import type { SceneAction } from '../narrative/scenes';
import SceneArt from './SceneArt';
import StoryQuote from './StoryQuote';

export default function RoomScene({
  reading,
  onAction,
}: {
  reading: RoomReading;
  onAction: (action: SceneAction) => void;
}) {
  const chapter = roomChapters[reading.chapter];
  const complete = roomComplete(reading);
  const cutting = reading.chapter === 2 || reading.chapter === 4;
  const response =
    cutting && reading.selected === 'wall' && !complete
      ? reading.chapter === 4
        ? 'Catch a loose edge. Pull all three strips. Someone is calling from the other side of the door.'
        : 'Follow the lines. Trace each loose edge to see what is behind them.'
      : reading.selected
        ? chapter.responses[reading.selected]
        : '';
  const quote =
    reading.chapter === 4 && !complete
      ? 'bars'
      : reading.chapter === 0 && reading.selected !== 'desk'
        ? 'writing'
        : chapter.quote;
  const icons = { desk: PenLine, door: DoorClosed, wall: ScanLine };
  return (
    <section
      className={`narrative-scene room-reading room-chapter-${reading.chapter}`}
      aria-label="Inside the story"
    >
      <div className="room-picture">
        <SceneArt name="bedroom" />
        <div className="room-light" aria-hidden="true" />
        <div className={`wall-study ${reading.selected === 'wall' ? 'is-studying' : ''}`}>
          <svg
            className="wall-drawing"
            viewBox="0 0 360 460"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <defs>
              <pattern id="room-pattern" width="90" height="115" patternUnits="userSpaceOnUse">
                <path d="M45 0C12 22 10 46 45 57C80 70 79 95 45 115M45 0C78 22 80 46 45 57C10 70 11 95 45 115" />
                <path d="M45 18C30 36 30 43 45 57C60 43 60 36 45 18ZM45 57C24 62 24 79 45 97C66 79 66 62 45 57ZM26 20Q5 16 13 36Q28 37 26 20ZM64 20Q85 16 77 36Q62 37 64 20ZM24 83Q6 79 12 98Q27 99 24 83ZM66 83Q84 79 78 98Q63 99 66 83Z" />
                <circle cx="45" cy="57" r="4" fill="#766b36" />
              </pattern>
            </defs>
            <rect width="360" height="460" fill={reading.chapter === 4 ? '#eee7d6' : '#b4a15b'} />
            <g
              className="woman-in-paper"
              opacity={
                reading.chapter >= 3 || (reading.chapter === 2 && reading.strips === 7) ? 1 : 0
              }
            >
              {reading.chapter === 4 ? (
                <>
                  <image
                    href={`${import.meta.env.BASE_URL}sources/ending-illustration.png`}
                    x="8"
                    y="140"
                    width="344"
                    height="200"
                    style={{ mixBlendMode: 'multiply' }}
                  />
                </>
              ) : (
                <>
                  <path d="M147 403Q110 350 139 299L165 262Q157 244 162 226Q171 208 187 217Q206 228 199 249L190 266Q210 298 207 327L247 370L238 380L184 347L167 318L157 350L177 403Z" />
                  <path d="M180 271Q154 284 126 310L101 354L111 361L144 322L178 308Z" />
                </>
              )}
            </g>
            {[0, 1, 2].map((strip) => (
              <g
                key={strip}
                className={`paper-strip ${(reading.strips & (1 << strip)) !== 0 ? 'is-pulled' : ''}`}
              >
                {reading.chapter === 4 && (
                  <rect x={strip * 120} width="120" height="460" fill="#b4a15b" />
                )}
                <rect x={strip * 120} width="120" height="460" fill="url(#room-pattern)" />
                <path className="paper-seam" d={`M${strip * 120 + 119} 0v460`} />
              </g>
            ))}
            {reading.chapter >= 3 && (
              <g className="wall-bars">
                {[45, 112, 179, 246, 313].map((x) => (
                  <path key={x} d={`M${x} 0V460`} />
                ))}
              </g>
            )}
          </svg>
          {cutting && (
            <div
              className="strip-controls"
              role="group"
              aria-label={reading.chapter === 4 ? 'Pull the wallpaper' : 'Study the pattern'}
            >
              {[0, 1, 2].map((strip) => (
                <button
                  key={strip}
                  className={(reading.strips & (1 << strip)) !== 0 ? 'is-pulled' : ''}
                  aria-label={`${reading.chapter === 4 ? 'Pull' : 'Trace'} strip ${strip + 1}`}
                  aria-pressed={(reading.strips & (1 << strip)) !== 0}
                  onClick={() => onAction({ type: 'ROOM_STRIP', strip })}
                >
                  <span>{(reading.strips & (1 << strip)) !== 0 ? '✓' : `${strip + 1}`}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="room-picture-caption">
          {reading.chapter === 4
            ? 'Original illustration · 1892, p. 656'
            : reading.chapter === 3
              ? 'The room, as she sees it.'
              : 'The upstairs room.'}
        </p>
      </div>
      <div className="room-page">
        <div className="room-chapter-line">
          <span>The Yellow Wall-Paper</span>
          <span>{reading.chapter + 1} / 5</span>
        </div>
        <p className="room-time">{chapter.time}</p>
        <h1>{chapter.title}</h1>
        <p className="room-lead">{chapter.lead}</p>
        <div className="room-objects" role="group" aria-label="Things in the room">
          {(['desk', 'door', 'wall'] as RoomObject[]).map((object) => {
            const Icon = icons[object];
            return (
              <button
                key={object}
                aria-pressed={reading.selected === object}
                onClick={() => onAction({ type: 'ROOM_INSPECT', object })}
              >
                <Icon size={18} />
                <span>{chapter.labels[object]}</span>
                <ArrowRight size={14} />
              </button>
            );
          })}
        </div>
        <div className="room-response" aria-live="polite" aria-atomic="true">
          {reading.selected ? (
            <>
              <p>{response}</p>
              <StoryQuote id={quote} />
            </>
          ) : (
            <p className="room-instruction">{chapter.instruction}</p>
          )}
        </div>
        <button
          className="primary room-continue"
          disabled={!complete}
          onClick={() => onAction({ type: 'ROOM_CONTINUE' })}
        >
          {chapter.next} <ArrowRight size={16} />
        </button>
        <p className="room-reading-note">
          A playable reading of Gilman’s story. The town is a separate, invented simulation.
        </p>
      </div>
    </section>
  );
}

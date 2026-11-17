import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Feather,
  Maximize2,
  RotateCcw,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { DEFAULT_SEED, initializeWorld, latest, runCounterfactual, stepWorld } from './sim/engine';
import type { GameState, InstitutionId, Narrative } from './sim/types';
import { PHASES, projectTransition, visualEvents } from './presentation/causality';
import { useAmbience } from './presentation/ambience';
import { useSceneTimer } from './presentation/useSceneTimer';
import { ENDING_QUOTE, filmReducer, INTRO_BEATS, quoteSource } from './narrative/film';
import { ORIGINAL_PDF, STORY_PDF } from './narrative/room';
import TownScene from './components/TownScene';
import SceneArt from './components/SceneArt';
import FilmIntro from './components/FilmIntro';
import Dialog from './components/Dialog';
import GameRecords, { type RecordPanel } from './components/GameRecords';

declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}

const totalWomenPublished = (world: GameState) =>
  world.snapshots.slice(1).reduce((total, snapshot) => total + snapshot.metrics.womenPublished, 0);

export default function App() {
  const [world, setWorld] = useState(() => initializeWorld(DEFAULT_SEED));
  const [scene, dispatch] = useReducer(filmReducer, { kind: 'TITLE' });
  const [panel, setPanel] = useState<RecordPanel | 'sources' | 'evidence' | null>(null);
  const [selectedId, setSelectedId] = useState('citizen-0');
  const [mobileTown, setMobileTown] = useState<'actual' | 'passive'>('actual');
  const [hidden, setHidden] = useState(document.hidden);
  const [width, setWidth] = useState(window.innerWidth);
  const lock = useRef(false);
  const initialMute = useRef<boolean | null>(null);
  const stage = useRef<HTMLElement>(null);
  const townViewport = useRef<HTMLDivElement>(null);
  const baseline = useMemo(() => runCounterfactual(world.seed), [world.seed]);
  const current = latest(world);
  const previous = world.snapshots[Math.max(0, world.turn - 1)];
  const busy = scene.kind === 'SIMULATION_CONSEQUENCE';
  const opening = scene.kind === 'CINEMATIC_INTRO';
  const cover = scene.kind === 'TITLE';
  const phase = busy ? scene.phase : -1;
  const snapshot = busy ? projectTransition(previous, current, phase) : current;
  const events = useMemo(
    () => (world.turn ? visualEvents(previous, current) : []),
    [previous, current, world.turn],
  );
  const ambience = useAmbience(opening || phase === 6);
  const timerPaused = hidden || panel !== null || (opening && scene.paused);

  function completeWeek() {
    lock.current = false;
    dispatch({ type: 'WEEK_COMPLETE', week: world.turn });
  }

  const advanceScene = useSceneTimer(
    opening ? `intro-${scene.beat}` : busy ? `week-${world.turn}-${phase}` : null,
    opening ? INTRO_BEATS[scene.beat].duration : busy ? PHASES[phase].duration : 0,
    timerPaused,
    () => {
      if (timerPaused) return;
      if (opening) dispatch({ type: 'NEXT_BEAT' });
      else if (busy && phase === 6) completeWeek();
      else if (busy) dispatch({ type: 'NEXT_PHASE' });
    },
  );

  useEffect(() => {
    const visibility = () => setHidden(document.hidden);
    const resize = () => setWidth(window.innerWidth);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('resize', resize);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const target = stage.current?.querySelector<HTMLElement>('[data-scene-focus]');
    target?.focus({ preventScroll: true });
  }, [scene.kind]);

  useEffect(() => {
    const viewport = townViewport.current;
    if (viewport && width <= 700 && scene.kind === 'TOWN_GAMEPLAY' && world.turn === 0)
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
  }, [scene.kind, width, world.turn]);

  function panTown(direction: number) {
    townViewport.current?.scrollBy({
      left: direction * width * 0.75,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        event.key.toLowerCase() === 'f' &&
        !panel &&
        !['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(
          (event.target as HTMLElement).tagName,
        )
      ) {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [panel]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        scene: scene.kind,
        turn: world.turn,
        seed: world.seed,
        busy,
        phase,
        intro: opening
          ? { beat: scene.beat, shot: INTRO_BEATS[scene.beat].id, paused: timerPaused }
          : null,
        panel: panel === null ? null : typeof panel === 'string' ? panel : panel.kind,
        selectedId,
        finished: world.isFinished,
        choices: { narrative: current.message?.narrative ?? null, channel: 'gazette' },
        metrics: snapshot.metrics,
        institutions: snapshot.institutions,
        news: snapshot.news,
        selected: {
          agent: snapshot.agents.find((agent) => agent.id === selectedId),
          decision: snapshot.decisions.find((decision) => decision.agentId === selectedId),
        },
        citizens: snapshot.agents.map((agent) => ({
          id: agent.id,
          belief: agent.belief,
          publications: agent.publications,
          baseAptitude: agent.baseAptitude,
        })),
        events,
        comparison: world.isFinished
          ? {
              actual: totalWomenPublished(world),
              passive: totalWomenPublished(baseline),
              weeks: '1–8',
            }
          : null,
        coordinates:
          'Town SVG: origin top-left, x right, y down. Movement displays recorded events.',
      });
    window.advanceTime = async (milliseconds) => {
      if (!Number.isFinite(milliseconds) || milliseconds <= 0) return;
      advanceScene(milliseconds);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  });

  function start() {
    if (initialMute.current !== false) ambience.enable();
    dispatch({ type: 'START' });
  }

  function restart() {
    lock.current = false;
    setWorld(initializeWorld(world.seed));
    setPanel(null);
    setSelectedId('citizen-0');
    setMobileTown('actual');
    dispatch({ type: 'RESTART' });
  }

  function play(narrative: Narrative) {
    if (lock.current || scene.kind !== 'TOWN_GAMEPLAY' || panel || world.isFinished) return;
    lock.current = true;
    setPanel(null);
    setWorld(stepWorld(world, { narrative, channel: 'gazette' }));
    dispatch({ type: 'PLAY_WEEK' });
  }

  function citizen(id: string, passive = false) {
    if (busy) return;
    setSelectedId(id);
    setPanel({ kind: 'citizen', id, passive });
  }
  function institution(id: InstitutionId, passive = false) {
    if (!busy) setPanel({ kind: 'institution', id, passive });
  }

  const mode = cover
    ? 'intro-mode'
    : opening
      ? 'film-mode'
      : scene.kind === 'LITERARY_EPILOGUE'
        ? 'closing-mode'
        : 'play-mode';

  return (
    <div className={`game-shell cinematic-game ${mode}`}>
      <header className="game-header">
        <span className="wordmark">
          <Feather size={19} aria-hidden="true" />
          The Pattern Beneath
        </span>
        <nav aria-label="Game settings">
          <button
            className="icon-button"
            aria-label={ambience.enabled ? 'Mute ambience' : 'Enable ambience'}
            aria-pressed={ambience.enabled}
            onClick={() => {
              initialMute.current = !ambience.enabled;
              ambience.toggle();
            }}
          >
            {ambience.enabled ? <Volume2 size={19} /> : <VolumeX size={19} />}
          </button>
          <button className="icon-button" aria-label="Sources" onClick={() => setPanel('sources')}>
            <BookOpen size={19} />
          </button>
          {!cover && (
            <button className="icon-button" aria-label="Restart game" onClick={restart}>
              <RotateCcw size={19} />
            </button>
          )}
          <button
            className="icon-button fullscreen-button"
            aria-label="Toggle fullscreen"
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen();
              else void document.documentElement.requestFullscreen().catch(() => {});
            }}
          >
            <Maximize2 size={18} />
          </button>
        </nav>
      </header>
      <main className="cinematic-stage" id="main-content" ref={stage}>
        {cover && (
          <section className="intro-overlay" aria-label="The Pattern Beneath">
            <SceneArt name="bedroom" />
            <div className="room-dust" aria-hidden="true" />
            <div className="title-copy">
              <h1>
                THE PATTERN
                <br />
                <em>BENEATH</em>
              </h1>
              <p className="title-tagline">Who gets to say what is real?</p>
              <button id="start-btn" className="primary" data-scene-focus onClick={start}>
                Start <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
        {opening && (
          <FilmIntro
            beat={scene.beat}
            paused={timerPaused}
            onPause={() => dispatch({ type: 'TOGGLE_PAUSE' })}
            onSkip={() => dispatch({ type: 'SKIP_INTRO' })}
          />
        )}
        {(scene.kind === 'TOWN_GAMEPLAY' || busy) && (
          <section className="play-scene" aria-label="Town simulation">
            <div className="week-hud">
              <h1 tabIndex={-1} data-scene-focus>
                Week {world.turn} <span>/ 8</span>
              </h1>
              <div className="publication-count" aria-label="Published this week">
                <span>Published</span>
                <strong>Women {snapshot.metrics.womenPublished}</strong>
                <strong>Men {snapshot.metrics.menPublished}</strong>
              </div>
              <button className="text-button" disabled={busy} onClick={() => citizen(selectedId)}>
                Records <BookOpen size={16} />
              </button>
            </div>
            <div className="town-view-shell">
              <div
                className={`town-view ${busy ? 'week-in-motion' : ''}`}
                aria-busy={busy}
                ref={townViewport}
              >
                <TownScene
                  snapshot={snapshot}
                  seed={world.seed}
                  selectedId={selectedId}
                  onCitizen={citizen}
                  onInstitution={institution}
                  phase={phase}
                  channel={busy ? 'gazette' : undefined}
                  influenceRecords={busy ? current.decisions : undefined}
                  events={events}
                  compact={width < 1180}
                  minimal
                  interactive={!busy}
                />
              </div>
              {width <= 700 && (
                <div className="town-pan">
                  <button
                    className="icon-button"
                    aria-label="Look left across town"
                    onClick={() => panTown(-1)}
                  >
                    <ChevronLeft size={22} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Look right across town"
                    onClick={() => panTown(1)}
                  >
                    <ChevronRight size={22} />
                  </button>
                </div>
              )}
              {busy && (
                <div className="week-progress" aria-hidden="true">
                  {PHASES.map((_, index) => (
                    <i key={index} className={index <= phase ? 'reached' : ''} />
                  ))}
                </div>
              )}
            </div>
            <div className="move-bar">
              <div className="move-status" aria-live="polite">
                {busy ? (
                  <button
                    className="text-button skip-week"
                    aria-label="Skip animation"
                    onClick={completeWeek}
                  >
                    Skip <SkipForward size={16} />
                  </button>
                ) : (
                  <span>Choose a story.</span>
                )}
              </div>
              <div className="message-actions" role="group" aria-label="Choose a story">
                <button
                  disabled={busy}
                  className="message-choice choice-agency"
                  onClick={() => play('equal-agency')}
                >
                  Let people try <ArrowRight size={19} />
                </button>
                <button
                  disabled={busy}
                  className="message-choice choice-hierarchy"
                  onClick={() => play('hierarchy')}
                >
                  Keep women out <ArrowRight size={19} />
                </button>
              </div>
            </div>
          </section>
        )}
        {scene.kind === 'COUNTERFACTUAL_REVEAL' && (
          <section className="quiet-comparison" aria-label="Two towns">
            <header className="result-heading">
              <h1 tabIndex={-1} data-scene-focus>
                What changed?
              </h1>
              <p>Women’s published work · Weeks 1–8</p>
            </header>
            <div className="result-tabs" role="group" aria-label="Choose comparison town">
              <button
                aria-pressed={mobileTown === 'actual'}
                onClick={() => setMobileTown('actual')}
              >
                Your town
              </button>
              <button
                aria-pressed={mobileTown === 'passive'}
                onClick={() => setMobileTown('passive')}
              >
                No intervention
              </button>
            </div>
            <div className={`result-worlds show-${mobileTown}`}>
              {(['actual', 'passive'] as const).map((side) => {
                const data = side === 'actual' ? world : baseline;
                return (
                  <section
                    className={`result-world result-${side}`}
                    key={side}
                    aria-label={side === 'actual' ? 'Your town' : 'No intervention'}
                  >
                    <div className="result-count">
                      <h2>{side === 'actual' ? 'Your town' : 'No intervention'}</h2>
                      <strong data-total={side}>{totalWomenPublished(data)}</strong>
                    </div>
                    <TownScene
                      snapshot={latest(data)}
                      seed={world.seed}
                      selectedId={selectedId}
                      onCitizen={(id) => citizen(id, side === 'passive')}
                      onInstitution={(id) => institution(id, side === 'passive')}
                      compact
                      minimal
                    />
                  </section>
                );
              })}
            </div>
            <div className="result-actions">
              <button className="text-button" onClick={() => setPanel('evidence')}>
                Details <BookOpen size={16} />
              </button>
              <button className="primary" onClick={() => dispatch({ type: 'FINISH' })}>
                Continue <ArrowRight size={18} />
              </button>
            </div>
          </section>
        )}
        {scene.kind === 'LITERARY_EPILOGUE' && (
          <section className="closing-scene" aria-label="Back in the room">
            <SceneArt name="bedroom" />
            <div className="closing-shade" />
            <figure className="ending-engraving">
              <img
                src={`${import.meta.env.BASE_URL}sources/ending-illustration.png`}
                alt="The original 1892 illustration: the narrator beside John, who has fainted."
              />
              <figcaption>Original illustration · 1892</figcaption>
            </figure>
            <div className="closing-copy">
              <h1 className="sr-only">Back in the room</h1>
              <blockquote>“{ENDING_QUOTE.text}”</blockquote>
              <a href={quoteSource(ENDING_QUOTE.page)} target="_blank" rel="noreferrer">
                The Yellow Wall-Paper · p. 656
              </a>
              <div className="closing-actions">
                <button className="primary" data-scene-focus onClick={restart}>
                  Play again <RotateCcw size={17} />
                </button>
                <button className="text-button" onClick={() => dispatch({ type: 'REVIEW' })}>
                  Compare towns
                </button>
              </div>
            </div>
          </section>
        )}
      </main>
      {panel && typeof panel === 'object' && (
        <GameRecords
          key={`${panel.kind}-${panel.id}-${panel.passive}`}
          panel={panel}
          world={world}
          baseline={baseline}
          onClose={() => setPanel(null)}
        />
      )}
      {panel === 'sources' && (
        <Dialog title="Sources" onClose={() => setPanel(null)}>
          <p>
            Opening and ending quotes: Charlotte Perkins Gilman, <em>The Yellow Wall-Paper</em>{' '}
            (1892). Each page link opens the original scan.
          </p>
          <p>
            <a href={STORY_PDF} target="_blank" rel="noreferrer">
              Read the original story (PDF)
            </a>
          </p>
          <p>
            <a href={ORIGINAL_PDF} target="_blank" rel="noreferrer">
              National Library of Medicine scan
            </a>
          </p>
          <p>
            The town and its people are invented. Its numbers are model results, not facts about
            real people. Clara is not the story’s narrator. The game does not model mental health.
          </p>
        </Dialog>
      )}
      {panel === 'evidence' && (
        <Dialog title="Recorded results" onClose={() => setPanel(null)} wide>
          <p>
            Same people, starting ability and chance events. The other town receives no messages.
            Counts below include weeks 1–8 only.
          </p>
          <table className="results-table">
            <caption>Published works by week</caption>
            <thead>
              <tr>
                <th>Week</th>
                <th>Your town: women / men</th>
                <th>No intervention: women / men</th>
              </tr>
            </thead>
            <tbody>
              {world.snapshots.slice(1).map((record) => (
                <tr key={record.turn}>
                  <th>{record.turn}</th>
                  <td>
                    {record.metrics.womenPublished} / {record.metrics.menPublished}
                  </td>
                  <td>
                    {baseline.snapshots[record.turn].metrics.womenPublished} /{' '}
                    {baseline.snapshots[record.turn].metrics.menPublished}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <details className="record-details">
            <summary>Counts and the editor’s view</summary>
            <p>
              <strong>Count:</strong> {current.news.observation}
            </p>
            <p>
              <strong>Editor’s view:</strong> {current.news.interpretation}
            </p>
            <p>
              Starting ability stays fixed. Access, practice, completed work and publication can
              change. These are fictional model assumptions.
            </p>
          </details>
        </Dialog>
      )}
    </div>
  );
}

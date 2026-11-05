import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  BookOpen,
  CircleHelp,
  Feather,
  HeartHandshake,
  Maximize2,
  Newspaper,
  Pause,
  Play,
  RotateCcw,
  Send,
  SkipForward,
  Users,
  X,
  ZoomIn,
  ZoomOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  CHANNEL_NAMES,
  DEFAULT_SEED,
  initializeWorld,
  latest,
  runCounterfactual,
  stepWorld,
} from './sim/engine';
import type { Channel, InstitutionId, Narrative, TurnSnapshot } from './sim/types';
import { PHASES, projectTransition, visualEvents } from './presentation/causality';
import TownScene from './components/TownScene';
import Inspector from './components/Inspector';
import Dialog from './components/Dialog';
import Sources, { LiteraryReturn } from './components/Sources';
import { LifePanel, percent, Portrait } from './components/Evidence';
import { ComparisonChart } from './components/Reveal';
import NarrativeScene from './components/NarrativeScene';
import { actForWeek, sceneReducer } from './narrative/scenes';
import SceneArt from './components/SceneArt';
import { useAmbience } from './presentation/ambience';
import { recordCaption } from './narrative/story';

type View = 'intro' | 'briefing' | 'playing' | 'final';
type Modal =
  'help' | 'sources' | 'midpoint' | 'ledger' | 'gazette' | 'evidence' | 'literature' | null;
type Transition = { from: TurnSnapshot; to: TurnSnapshot; phase: number };
declare global {
  interface Window {
    render_game_to_text?: () => string;
    advanceTime?: (ms: number) => Promise<void>;
  }
}
export default function App() {
  const [world, setWorld] = useState(() => initializeWorld(DEFAULT_SEED));
  const [scene, dispatchScene] = useReducer(sceneReducer, { kind: 'TITLE' });
  const view: View =
    scene.kind === 'TITLE'
      ? 'intro'
      : scene.kind === 'TOWN_GAMEPLAY' || scene.kind === 'SIMULATION_CONSEQUENCE'
        ? 'playing'
        : scene.kind === 'COUNTERFACTUAL_REVEAL'
          ? 'final'
          : 'briefing';
  const [modal, setModal] = useState<Modal>(null);
  const [narrative, setNarrative] = useState<Narrative>('equal-agency');
  const [channel, setChannel] = useState<Channel>('gazette');
  const [selectedId, setSelectedId] = useState('citizen-0');
  const [inspector, setInspector] = useState<{
    kind: 'citizen' | 'institution';
    id: string;
  } | null>(null);
  const [transition, setTransition] = useState<Transition | null>(null);
  const [viewedWeek, setViewedWeek] = useState<number | null>(null);
  const [compareWeek, setCompareWeek] = useState(0);
  const [comparePlaying, setComparePlaying] = useState(false);
  const [revealSeen, setRevealSeen] = useState(false);
  const [mobileTown, setMobileTown] = useState<'actual' | 'baseline'>('actual');
  const [evidenceTab, setEvidenceTab] = useState<'outcomes' | 'aptitude'>('outcomes');
  const [zoom, setZoom] = useState(false);
  const [width, setWidth] = useState(window.innerWidth);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lock = useRef(false);
  const reduced = useReducedMotion();
  const ambience = useAmbience(scene.kind === 'PROLOGUE' || transition?.phase === 6);
  const current = latest(world);
  const baseline = useMemo(() => runCounterfactual(world.seed), [world.seed]);
  const record =
    view === 'final' ? world.snapshots[compareWeek] : world.snapshots[viewedWeek ?? world.turn];
  const snapshot = transition
    ? projectTransition(transition.from, transition.to, transition.phase)
    : record;
  const passive = baseline.snapshots[compareWeek];
  const historical = view === 'playing' && viewedWeek !== null && viewedWeek !== world.turn;
  const visual = transition
    ? visualEvents(transition.from, transition.to)
    : world.turn
      ? visualEvents(world.snapshots[world.turn - 1], current)
      : [];
  const changed = transition
    ? transition.to.decisions.filter((d) => Math.abs(d.beliefAfter - d.beliefBefore) > 0.035).length
    : 0;
  const followed = snapshot.agents.find((a) => a.id === selectedId)!;
  const followedDecision = snapshot.decisions.find((decision) => decision.agentId === selectedId)!;
  function clearTimers() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      clearTimers();
    };
  }, []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && inspector && !modal) setInspector(null);
      if (
        event.key.toLowerCase() === 'f' &&
        !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(
          (event.target as HTMLElement).tagName,
        ) &&
        !modal
      ) {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [inspector, modal]);
  useEffect(() => {
    if (view !== 'final' || !comparePlaying) return;
    if (reduced) {
      setCompareWeek(8);
      setRevealSeen(true);
      setComparePlaying(false);
      return;
    }
    const timer = setInterval(
      () =>
        setCompareWeek((week) => {
          if (week >= 7) {
            setComparePlaying(false);
            setRevealSeen(true);
            return 8;
          }
          return week + 1;
        }),
      450,
    );
    return () => clearInterval(timer);
  }, [view, comparePlaying, reduced]);
  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        view,
        scene: scene.kind,
        room: scene.kind === 'ROOM' ? scene.reading : null,
        dialogue:
          scene.kind === 'CHARACTER_ENCOUNTER'
            ? { actorId: scene.actorId, topic: scene.topic }
            : null,
        modal,
        seed: world.seed,
        turn: world.turn,
        viewedWeek: snapshot.turn,
        finished: world.isFinished,
        busy: !!transition,
        phase: transition?.phase ?? -1,
        phaseTitle: transition ? PHASES[transition.phase].title : null,
        compareWeek,
        comparePlaying,
        revealSeen,
        choices: { narrative, channel },
        metrics: snapshot.metrics,
        institutions: snapshot.institutions,
        selected: {
          id: selectedId,
          name: followed.name,
          decision: snapshot.decisions.find((d) => d.agentId === selectedId),
        },
        news: snapshot.news,
        events: visual,
        citizens: snapshot.agents.map((a) => ({
          id: a.id,
          belief: a.belief,
          publications: a.publications,
          ...(view === 'final' ? { aptitude: a.baseAptitude } : {}),
        })),
        coordinates:
          'SVG town: origin top-left, x right, y down. Movement is a stylized projection of logged interactions, not a physical model.',
      });
    window.advanceTime = async () => {
      await Promise.resolve();
    };
    return () => {
      delete window.render_game_to_text;
      delete window.advanceTime;
    };
  }, [
    world,
    view,
    modal,
    snapshot,
    transition,
    narrative,
    channel,
    selectedId,
    followed,
    visual,
    compareWeek,
    comparePlaying,
    revealSeen,
    scene,
  ]);
  function finish(to: TurnSnapshot) {
    clearTimers();
    setTransition(null);
    lock.current = false;
    dispatchScene({ type: 'ROUND_COMPLETE', week: to.turn });
    if (to.turn === 8) {
      setSelectedId('citizen-0');
      setInspector(null);
      setCompareWeek(reduced ? 8 : 0);
      setRevealSeen(!!reduced);
      setComparePlaying(!reduced);
    }
  }
  function release(quiet = false) {
    if (lock.current || world.isFinished || historical || modal || scene.kind !== 'TOWN_GAMEPLAY')
      return;
    lock.current = true;
    dispatchScene({ type: 'RELEASE' });
    setInspector(null);
    const from = current;
    const next = stepWorld(world, quiet ? null : { narrative, channel });
    setWorld(next);
    setViewedWeek(null);
    const to = latest(next);
    setTransition({ from, to, phase: 0 });
    let elapsed = 0;
    PHASES.forEach((phase, index) => {
      elapsed += phase.duration;
      timers.current.push(
        setTimeout(
          () => (index === 6 ? finish(to) : setTransition({ from, to, phase: index + 1 })),
          elapsed,
        ),
      );
    });
  }
  function restart(nextNarrative = narrative, cover = false) {
    clearTimers();
    lock.current = false;
    setTransition(null);
    setWorld(initializeWorld(world.seed));
    setSelectedId('citizen-0');
    setInspector(null);
    setModal(null);
    setViewedWeek(null);
    setNarrative(nextNarrative);
    dispatchScene({ type: 'RESTART', cover });
    setComparePlaying(false);
    setRevealSeen(false);
    setZoom(false);
  }
  function citizen(id: string) {
    setSelectedId(id);
    setInspector({ kind: 'citizen', id });
  }
  function institution(id: InstitutionId) {
    setInspector({ kind: 'institution', id });
  }
  function inspectWeek(week: number) {
    if (transition) return;
    if (view === 'final') {
      setComparePlaying(false);
      setCompareWeek(week);
    } else setViewedWeek(week);
  }
  function talk() {
    if (transition || !inspector) return;
    const actorId =
      inspector.kind === 'citizen'
        ? inspector.id
        : snapshot.institutions.find((i) => i.id === inspector.id)!.leaderId;
    setSelectedId(actorId);
    setInspector(null);
    dispatchScene({
      type: 'ENCOUNTER',
      actorId,
      resume: view === 'final' ? 'COUNTERFACTUAL_REVEAL' : 'TOWN_GAMEPLAY',
    });
  }
  const phaseText = transition
    ? transition.phase === 2
      ? `${changed} citizens revised their beliefs.`
      : transition.phase === 5
        ? `${transition.to.metrics.womenPublished + transition.to.metrics.menPublished} works reached the page.`
        : PHASES[transition.phase].title
    : historical
      ? `Viewing week ${snapshot.turn}. Return to the present to intervene.`
      : world.turn
        ? `${visual.filter((e) => e.kind !== 'policy')[0]?.text ?? 'The town waits for your next move.'}`
        : 'What a town believes shapes what it permits.';
  return (
    <div
      className={`game-shell ${view}-mode scene-${scene.kind} ${transition ? 'is-transitioning' : ''}`}
    >
      <header className="game-header">
        <button
          className="wordmark"
          aria-label="The Pattern Beneath, return to cover"
          onClick={() => restart(narrative, true)}
        >
          <Feather size={19} aria-hidden="true" />
          <span>The Pattern Beneath</span>
        </button>
        <span className="header-context">
          {view === 'intro' || view === 'briefing'
            ? scene.kind === 'ROOM'
              ? 'Inside The Yellow Wall-Paper'
              : 'A story. A town. Eight weeks.'
            : view === 'final'
              ? 'The same world. Two possible paths.'
              : `${actForWeek(snapshot.turn)} · ${String(snapshot.turn).padStart(2, '0')} / 08`}
        </span>
        <nav aria-label="Game navigation">
          <button
            className="icon-button"
            aria-label={ambience.enabled ? 'Mute ambience' : 'Enable ambience'}
            aria-pressed={ambience.enabled}
            onClick={ambience.toggle}
          >
            {ambience.enabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button"
            aria-label="Sources and model notes"
            onClick={() => setModal('sources')}
          >
            <BookOpen size={18} />
          </button>
          <button className="icon-button" aria-label="How to play" onClick={() => setModal('help')}>
            <CircleHelp size={19} />
          </button>
          {view !== 'intro' && (
            <button
              className="icon-button"
              aria-label="Restart experiment"
              onClick={() => restart(narrative, true)}
            >
              <RotateCcw size={18} />
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
            <Maximize2 size={17} />
          </button>
        </nav>
      </header>
      <main
        className={`game-stage ${view === 'final' ? 'comparison-stage' : ''}`}
        id="main-content"
      >
        {view !== 'final' ? (
          <>
            <div className={`world-space ${zoom ? 'zoomed' : ''}`} inert={view !== 'playing'}>
              {view === 'playing' && (
                <div className="metrics-hud" aria-label="Live civic metrics">
                  <div>
                    <span>Believe the old story</span>
                    <strong>{percent(snapshot.metrics.acceptance)}</strong>
                  </div>
                  <div>
                    <span>Rules that shut people out</span>
                    <strong>{percent(snapshot.metrics.restrictions)}</strong>
                  </div>
                  <div>
                    <span>Places in class</span>
                    <strong className="access-value">
                      ♀ {Math.round(snapshot.metrics.accessWomen * 24)}/24{' '}
                      <i>♂ {Math.round(snapshot.metrics.accessMen * 24)}/24</i>
                    </strong>
                  </div>
                  <div>
                    <span>Women’s published work</span>
                    <strong>
                      {snapshot.metrics.publicationShare === null
                        ? '—'
                        : percent(snapshot.metrics.publicationShare)}{' '}
                      <em>
                        {snapshot.metrics.womenPublished}/
                        {snapshot.metrics.womenPublished + snapshot.metrics.menPublished}
                      </em>
                    </strong>
                  </div>
                </div>
              )}
              <div className="world-viewport">
                <div className="world-caption">
                  <p>VESPER</p>
                  <span>48 people. Who gets a chance?</span>
                </div>
                <div
                  className={`world-camera messenger-${transition?.to.message?.channel ?? 'none'}`}
                >
                  <TownScene
                    snapshot={snapshot}
                    seed={world.seed}
                    selectedId={selectedId}
                    onCitizen={citizen}
                    onInstitution={institution}
                    phase={transition?.phase ?? -1}
                    channel={transition?.to.message?.channel}
                    influenceRecords={transition?.to.decisions}
                    events={visual}
                    compact={width < 1180 || view !== 'playing'}
                  />
                </div>
                {view === 'playing' && (
                  <>
                    <div className="world-tools">
                      <label className="sr-only" htmlFor="follow-select">
                        Follow a citizen
                      </label>
                      <select
                        id="follow-select"
                        value={selectedId}
                        onChange={(e) => citizen(e.target.value)}
                      >
                        {snapshot.agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                      <button
                        className="icon-button"
                        aria-label={zoom ? 'Zoom out of town' : 'Zoom into town'}
                        onClick={() => setZoom((v) => !v)}
                      >
                        {zoom ? <ZoomOut size={17} /> : <ZoomIn size={17} />}
                      </button>
                    </div>
                    <div className="world-legend">
                      <span>
                        <i className="hierarchy-key" />
                        Believes the old story
                      </span>
                      <span>
                        <i className="agency-key" />
                        Questions it
                      </span>
                      <span>
                        <i className="neutral-key" />
                        Undecided
                      </span>
                    </div>
                  </>
                )}
                {view === 'playing' && inspector && (
                  <Inspector
                    kind={inspector.kind}
                    id={inspector.id}
                    snapshot={snapshot}
                    world={world}
                    onClose={() => setInspector(null)}
                    onTalk={talk}
                    canTalk={!transition}
                    onDetails={() => setModal(inspector.kind === 'citizen' ? 'ledger' : 'evidence')}
                  />
                )}
                {view === 'playing' && (
                  <div
                    className={`causality-toast ${transition ? 'active' : ''}`}
                    role="status"
                    aria-live="polite"
                  >
                    <Feather size={16} />
                    <span>{phaseText}</span>
                  </div>
                )}
                {transition && (
                  <button
                    className="skip-cinematic"
                    onClick={() => finish(transition.to)}
                    aria-label="Skip animation"
                  >
                    Skip <SkipForward size={15} />
                  </button>
                )}
              </div>
            </div>
            {view === 'playing' && (
              <aside className="control-panel">
                <SceneArt name="wallpaper" className="control-texture" />
                <div className="control-title">
                  <p className="folio">Your move</p>
                  <h1>What gets repeated?</h1>
                  <span>Week {Math.min(world.turn + 1, 8)} of 8</span>
                </div>
                <div className="desktop-choices">
                  <fieldset disabled={!!transition || historical}>
                    <legend>What should the town believe?</legend>
                    {(['equal-agency', 'hierarchy'] as Narrative[]).map((value) => (
                      <label
                        className={`claim-choice ${narrative === value ? 'chosen' : ''}`}
                        key={value}
                      >
                        <input
                          type="radio"
                          name="narrative"
                          value={value}
                          checked={narrative === value}
                          onChange={() => setNarrative(value)}
                        />
                        <span>
                          <strong>
                            {value === 'equal-agency' ? 'Let people try' : 'Keep women out'}
                          </strong>
                          <span>
                            {value === 'equal-agency'
                              ? 'Judge the work, whoever made it.'
                              : 'Say that serious writing is men’s work.'}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <fieldset className="channels" disabled={!!transition || historical}>
                    <legend>Who carries it?</legend>
                    {(['clinic', 'gazette', 'community'] as Channel[]).map((value) => {
                      const Icon =
                        value === 'clinic'
                          ? HeartHandshake
                          : value === 'gazette'
                            ? Newspaper
                            : Users;
                      return (
                        <label
                          className={`channel-choice ${channel === value ? 'chosen' : ''}`}
                          key={value}
                        >
                          <input
                            type="radio"
                            name="channel"
                            value={value}
                            checked={channel === value}
                            onChange={() => setChannel(value)}
                          />
                          <Icon size={19} />
                          <span>
                            {CHANNEL_NAMES[value]}
                            <span>
                              {value === 'clinic'
                                ? 'People trust the doctor. Fewer hear it.'
                                : value === 'gazette'
                                  ? 'Most people see it. Some doubt it.'
                                  : 'Friends talk. The story spreads slowly.'}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </fieldset>
                </div>
                <div className="mobile-choices">
                  <label>
                    Choose a narrative
                    <select
                      aria-label="Choose a narrative"
                      value={narrative}
                      onChange={(e) => setNarrative(e.target.value as Narrative)}
                      disabled={!!transition || historical}
                    >
                      <option value="equal-agency">Let people try</option>
                      <option value="hierarchy">Keep women out</option>
                    </select>
                  </label>
                  <label>
                    Choose a messenger
                    <select
                      aria-label="Choose a messenger"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as Channel)}
                      disabled={!!transition || historical}
                    >
                      <option value="clinic">Physicians’ Council</option>
                      <option value="gazette">Town Gazette</option>
                      <option value="community">Community Circle</option>
                    </select>
                  </label>
                </div>
                <div className="release-controls">
                  <button
                    className="primary release-button"
                    disabled={!!transition || historical}
                    onClick={() => release()}
                    aria-label="Release narrative and advance one week"
                  >
                    {transition ? (
                      <>
                        {PHASES[transition.phase].title}
                        <span className="processing-dot" />
                      </>
                    ) : (
                      <>
                        Send the story <Send size={16} />
                      </>
                    )}
                  </button>
                  <div className="release-subline">
                    {historical ? (
                      <button className="text-button" onClick={() => setViewedWeek(null)}>
                        Return to the present <ArrowRight size={14} />
                      </button>
                    ) : (
                      <>
                        <span>One message. One week.</span>
                        <button
                          className="text-button"
                          onClick={() => release(true)}
                          disabled={!!transition}
                          aria-label="Advance a quiet week with no intervention"
                        >
                          Let a week pass
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <button className="followed-citizen" onClick={() => citizen(selectedId)}>
                  <span className="followed-initial">{followed.name[0]}</span>
                  <span>
                    <span>This week for</span>
                    <strong>{followed.name}</strong>
                  </span>
                  <ArrowRight size={15} />
                </button>
                <div className="followed-week" aria-label={`${followed.name}, this week`}>
                  <span>{followedDecision.schoolAccess ? '✓ Class' : '× No class'}</span>
                  <span>{followedDecision.manuscript ? '✓ Piece finished' : '— No piece'}</span>
                  <span>{followedDecision.published ? '✓ Printed' : '— Not printed'}</span>
                </div>
                <p className="model-footnote">Invented town · ability stays fixed</p>
              </aside>
            )}
            {view === 'intro' && (
              <section className="intro-overlay">
                <SceneArt name="bedroom" />
                <div className="room-dust" aria-hidden="true" />
                <div className="title-copy">
                  <h1>
                    THE PATTERN
                    <br />
                    <em>BENEATH</em>
                  </h1>
                  <p className="title-tagline">Who gets to say what is real?</p>
                  <button
                    id="start-btn"
                    className="primary"
                    onClick={() => dispatchScene({ type: 'ENTER_STORY' })}
                  >
                    Enter the Story <ArrowRight size={18} />
                  </button>
                  <button className="text-button intro-help" onClick={() => setModal('help')}>
                    How to play · about 10 minutes
                  </button>
                </div>
              </section>
            )}
            {view === 'briefing' && (
              <NarrativeScene
                scene={scene}
                snapshot={snapshot}
                world={world}
                onAction={dispatchScene}
                onSources={() => setModal('sources')}
                onRestart={(opposite, cover) =>
                  restart(
                    opposite
                      ? narrative === 'hierarchy'
                        ? 'equal-agency'
                        : 'hierarchy'
                      : narrative,
                    cover,
                  )
                }
              />
            )}
          </>
        ) : (
          <>
            <div className="comparison-heading">
              <div>
                <p className="folio">A controlled comparison · Week {compareWeek} of 8</p>
                <h1>
                  {revealSeen
                    ? 'The abilities did not change.'
                    : 'The same town. The same beginning.'}
                  <em>
                    {revealSeen
                      ? current.institutions.some(
                          (institution, index) =>
                            institution.rule !== latest(baseline).institutions[index].rule,
                        )
                        ? ' The rules did.'
                        : ' The rules did not diverge.'
                      : ' A different story.'}
                  </em>
                </h1>
              </div>
              <button
                className="play-comparison icon-button"
                aria-label={comparePlaying ? 'Pause comparison' : 'Replay comparison'}
                onClick={() => {
                  if (comparePlaying) setComparePlaying(false);
                  else {
                    setCompareWeek(0);
                    setComparePlaying(true);
                  }
                }}
              >
                {comparePlaying ? <Pause size={18} /> : <Play size={18} />}
              </button>
            </div>
            <div className="comparison-tabs" role="group" aria-label="Choose comparison town">
              <button
                aria-pressed={mobileTown === 'actual'}
                onClick={() => setMobileTown('actual')}
              >
                Your town
              </button>
              <button
                aria-pressed={mobileTown === 'baseline'}
                onClick={() => setMobileTown('baseline')}
              >
                No intervention
              </button>
            </div>
            <div className={`dual-worlds mobile-${mobileTown}`}>
              <section className="comparison-world actual-world">
                <header>
                  <h2>Your town</h2>
                  <span>
                    ♀ {snapshot.metrics.womenPublished} · ♂ {snapshot.metrics.menPublished} works
                  </span>
                </header>
                <TownScene
                  snapshot={snapshot}
                  seed={world.seed}
                  selectedId={selectedId}
                  onCitizen={citizen}
                  onInstitution={institution}
                  compact
                />
                <div className="comparison-state">
                  <span>{percent(snapshot.metrics.restrictions)} restriction</span>
                  <span>{Math.round(snapshot.metrics.accessWomen * 24)}/24 women admitted</span>
                </div>
                <div className="clara-echo">
                  <Portrait agent={snapshot.agents[0]} />
                  <div>
                    <strong>Clara · Your town</strong>
                    <span>{recordCaption(snapshot)}</span>
                  </div>
                </div>
              </section>
              <section className="comparison-world baseline-world">
                <header>
                  <h2>No intervention</h2>
                  <span>
                    ♀ {passive.metrics.womenPublished} · ♂ {passive.metrics.menPublished} works
                  </span>
                </header>
                <TownScene
                  snapshot={passive}
                  seed={world.seed}
                  selectedId={selectedId}
                  onCitizen={citizen}
                  onInstitution={institution}
                  compact
                />
                <div className="comparison-state">
                  <span>{percent(passive.metrics.restrictions)} restriction</span>
                  <span>{Math.round(passive.metrics.accessWomen * 24)}/24 women admitted</span>
                </div>
                <div className="clara-echo">
                  <Portrait agent={passive.agents[0]} />
                  <div>
                    <strong>Clara · Without intervention</strong>
                    <span>{recordCaption(passive)}</span>
                  </div>
                </div>
              </section>
            </div>
            <div className="comparison-follow">
              <label htmlFor="compare-citizen">Compare one life</label>
              <select
                id="compare-citizen"
                value={selectedId}
                onChange={(e) => citizen(e.target.value)}
              >
                {snapshot.agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button className="text-button" onClick={() => citizen(selectedId)}>
                See both paths <ArrowRight size={15} />
              </button>
              <span>Same aptitude. Same event draws.</span>
            </div>
            {inspector && (
              <Inspector
                kind={inspector.kind}
                id={inspector.id}
                snapshot={snapshot}
                world={world}
                baseline={passive}
                onClose={() => setInspector(null)}
                onTalk={talk}
                onDetails={() => setModal(inspector.kind === 'citizen' ? 'ledger' : 'evidence')}
              />
            )}
            <div className="final-actions">
              <button
                className="text-button"
                onClick={() => {
                  setInspector(null);
                  dispatchScene({ type: 'UNRAVEL' });
                }}
              >
                Look beneath the pattern <BookOpen size={16} />
              </button>
              <button className="text-button" onClick={() => setModal('evidence')}>
                Inspect the evidence <ArrowRight size={15} />
              </button>
              <button
                className="primary"
                onClick={() => restart(narrative === 'hierarchy' ? 'equal-agency' : 'hierarchy')}
              >
                Try the opposite narrative <RotateCcw size={15} />
              </button>
              <button
                className="icon-button"
                onClick={() => restart()}
                aria-label="Restart same town"
              >
                <RotateCcw size={17} />
              </button>
            </div>
          </>
        )}
      </main>
      <footer className="game-footer">
        {view === 'playing' || view === 'final' ? (
          <>
            <div className="timeline">
              <span>{view === 'final' ? 'Two towns · synchronized' : 'The eight-week record'}</span>
              <div role="group" aria-label="Inspect the weekly timeline">
                {Array.from({ length: 9 }, (_, i) => (
                  <button
                    key={i}
                    disabled={!!transition || i > world.turn}
                    aria-pressed={snapshot.turn === i}
                    aria-label={i === 0 ? 'Inspect opening edition' : `Inspect week ${i}`}
                    onClick={() => inspectWeek(i)}
                  >
                    {i === 0 ? '○' : String(i).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <span className="timeline-help">
                {transition
                  ? `${transition.phase + 1} / 7 · ${PHASES[transition.phase].title}`
                  : view === 'final'
                    ? 'Identical initial conditions'
                    : 'Click a person or a building to explore'}
              </span>
            </div>
            <button className="gazette-ribbon" onClick={() => setModal('gazette')}>
              <span className="gazette-name">
                <Feather size={17} />
                The Vesper Gazette
              </span>
              <span>{snapshot.news.headline}</span>
              <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <div className="opening-ribbon">
            <Feather size={18} />
            <span>
              <strong>
                {world.turn === 0
                  ? 'The opening edition'
                  : `Week ${world.turn} · The town’s record`}
              </strong>
              {current.news.headline}
            </span>
            <span className="opening-count">
              {current.news.women} works by women. {current.news.men} by men.
              <br />
              An observation is not an explanation.
            </span>
          </div>
        )}
      </footer>
      {modal && (
        <Dialog
          title={
            modal === 'help'
              ? 'How to play'
              : modal === 'sources'
                ? 'Sources & model notes'
                : modal === 'midpoint'
                  ? 'A note from the archive'
                  : modal === 'ledger'
                    ? 'The decision ledger'
                    : modal === 'gazette'
                      ? 'The Vesper Gazette'
                      : modal === 'literature'
                        ? 'Behind the wallpaper'
                        : 'Inspect the evidence'
          }
          onClose={() => setModal(null)}
          wide={modal === 'sources' || modal === 'ledger' || modal === 'evidence'}
        >
          {modal === 'help' && (
            <div className="help-content">
              <p>
                Pick a story and who will spread it. Send it to town. A week passes: people talk,
                rules shift, and some people get a chance to write. Watch what happens to Clara.
              </p>
              <ol>
                <li>
                  Gold rings show who believes women should be kept out. Olive rings show who doubts
                  that story. Pick a person to see what happened to them.
                </li>
                <li>Pick a building to see who got in and who was refused.</li>
                <li>
                  Watch the week play out, or press Skip. The same decisions are recorded either
                  way.
                </li>
                <li>
                  Between weeks, return to the room in Gilman’s story. Try its objects and follow
                  the changing wallpaper. After eight weeks, compare your town with one you left
                  alone.
                </li>
              </ol>
              <p>
                Tab and Enter operate controls. Arrow keys change radio options. Escape closes
                overlays. F outside controls toggles fullscreen. Motion preferences are respected.
              </p>
              <p className="note">
                Nothing is saved. Refresh starts again. Town movement shows recorded interactions.
              </p>
            </div>
          )}
          {modal === 'sources' && <Sources />}
          {modal === 'midpoint' && (
            <div className="midpoint">
              <Feather size={28} />
              <h3>
                The town counted what
                <br />
                reached the page.
              </h3>
              <p>Has anyone measured ability separately from the opportunity to use it?</p>
              <p className="note">Keep watching the rules as well as the results.</p>
              <button className="primary" onClick={() => setModal(null)}>
                Continue the experiment <ArrowRight size={16} />
              </button>
            </div>
          )}
          {modal === 'ledger' && (
            <LifePanel
              world={{
                ...world,
                turn: snapshot.turn,
                snapshots: world.snapshots.slice(0, snapshot.turn + 1),
              }}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setInspector({ kind: 'citizen', id });
              }}
              reveal={view === 'final'}
            />
          )}
          {modal === 'gazette' && (
            <div className="newspaper-overlay">
              <p className="folio">Week {snapshot.turn} · Observation and interpretation</p>
              <h3>{snapshot.news.headline}</h3>
              <p>
                <strong>What was counted:</strong> {snapshot.news.observation}
              </p>
              <p>
                <strong>The editor’s claim:</strong> {snapshot.news.interpretation}
              </p>
              <p className="note">
                People read this claim next week. The counts are real inside the model; the headline
                is the editor’s explanation of them.
              </p>
            </div>
          )}
          {modal === 'literature' && <LiteraryReturn />}
          {modal === 'evidence' && (
            <div className="evidence-overlay">
              <div className="evidence-tabs">
                <button
                  aria-pressed={evidenceTab === 'outcomes'}
                  onClick={() => setEvidenceTab('outcomes')}
                >
                  Observed outcomes
                </button>
                <button
                  aria-pressed={evidenceTab === 'aptitude'}
                  disabled={view !== 'final'}
                  onClick={() => setEvidenceTab('aptitude')}
                >
                  The unchanged aptitude
                </button>
              </div>
              {evidenceTab === 'outcomes' || view !== 'final' ? (
                <>
                  <p className="note">
                    Both towns start with the same people and chance events. These are counts of
                    work that was printed in the model.
                  </p>
                  <div className="chart-legend">
                    <span>— Your town</span>
                    <span>┄ No intervention</span>
                  </div>
                  <ComparisonChart world={world} baseline={baseline} />
                  <table>
                    <caption>Recorded publications by week</caption>
                    <thead>
                      <tr>
                        <th>Week</th>
                        <th>Your town: women / men</th>
                        <th>Passive: women / men</th>
                      </tr>
                    </thead>
                    <tbody>
                      {world.snapshots.map((s, i) => (
                        <tr key={i}>
                          <th>{i === 0 ? 'Opening' : i}</th>
                          <td>
                            {s.metrics.womenPublished} / {s.metrics.menPublished}
                          </td>
                          <td>
                            {baseline.snapshots[i].metrics.womenPublished} /{' '}
                            {baseline.snapshots[i].metrics.menPublished}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : (
                <>
                  <p>
                    24 pairs. Each woman and her paired man start with the same ability. Those
                    values stay the same in both towns.
                  </p>
                  <p className="note">
                    We chose this rule to help compare the towns. It is not a claim about real
                    people. Practice can grow; starting ability stays fixed.
                  </p>
                  <table>
                    <thead>
                      <tr>
                        <th>Pair</th>
                        <th>Initial woman / man</th>
                        <th>Current woman / man</th>
                        <th>Passive woman / man</th>
                      </tr>
                    </thead>
                    <tbody>
                      {current.agents
                        .filter((a) => a.gender === 'woman')
                        .map((a) => {
                          const man = current.agents.find(
                            (m) => m.pair === a.pair && m.gender === 'man',
                          )!;
                          return (
                            <tr key={a.id}>
                              <th>{a.pair + 1}</th>
                              <td>
                                {world.snapshots[0].agents
                                  .find((x) => x.id === a.id)!
                                  .baseAptitude.toFixed(3)}{' '}
                                / {man.baseAptitude.toFixed(3)}
                              </td>
                              <td>
                                {a.baseAptitude.toFixed(3)} / {man.baseAptitude.toFixed(3)}
                              </td>
                              <td>
                                {latest(baseline)
                                  .agents.find((x) => x.id === a.id)!
                                  .baseAptitude.toFixed(3)}{' '}
                                /{' '}
                                {latest(baseline)
                                  .agents.find((x) => x.id === man.id)!
                                  .baseAptitude.toFixed(3)}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}

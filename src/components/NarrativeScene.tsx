import { useEffect, useRef, useState } from 'react';
import { ArrowRight, BookOpen, Feather, RotateCcw, Search } from 'lucide-react';
import type { GameState, TurnSnapshot } from '../sim/types';
import { Portrait } from './Evidence';
import { actForWeek, type SceneAction, type SceneState } from '../narrative/scenes';
import { citizenDialogue, dialogueChoices, recordCaption } from '../narrative/story';
import { characterArt } from '../presentation/art';
import SceneArt from './SceneArt';
import Dialog from './Dialog';
import RoomScene from './RoomScene';
import StoryQuote from './StoryQuote';

const chain = [
  'A story gets repeated',
  'People believe it',
  'Leaders back it',
  'Rules follow',
  'Chances change',
  'Work changes',
  'The paper counts it',
  'The headline feeds back',
];
export default function NarrativeScene({
  scene,
  snapshot,
  world,
  onAction,
  onSources,
  onRestart,
}: {
  scene: SceneState;
  snapshot: TurnSnapshot;
  world: GameState;
  onAction: (action: SceneAction) => void;
  onSources: () => void;
  onRestart: (opposite: boolean, cover?: boolean) => void;
}) {
  const [object, setObject] = useState<'claim' | 'claimReply' | 'manuscript' | null>(null);
  const replyRef = useRef<HTMLQuoteElement>(null);
  useEffect(() => {
    if (scene.kind === 'CHARACTER_ENCOUNTER' && scene.playerLine)
      replyRef.current?.focus({ preventScroll: true });
  }, [scene]);
  const clara = snapshot.agents.find((agent) => agent.id === 'citizen-0')!;
  if (scene.kind === 'ROOM') return <RoomScene reading={scene.reading} onAction={onAction} />;
  const inspected = object && (
    <Dialog
      title={object === 'manuscript' ? 'The manuscript' : 'A phrase in the margin'}
      onClose={() => setObject(null)}
    >
      {object === 'manuscript' ? (
        <>
          <SceneArt name="manuscript" className="object-art" />
          <p className="folio">Clara Vale · Week {snapshot.turn}</p>
          <p>{citizenDialogue(snapshot, clara.id, 'work')}</p>
          <p className="note">
            {recordCaption(snapshot)}. The pictured pages belong to the story; the weekly record
            tracks whether Clara completed a new piece.
          </p>
        </>
      ) : (
        <>
          <p className="folio">Benjamin Grey · Editor of the Gazette</p>
          {object === 'claimReply' && (
            <p className="margin-challenge">“The figures do not prove that headline.”</p>
          )}
          <blockquote>
            “
            {citizenDialogue(
              snapshot,
              'citizen-29',
              object === 'claimReply' ? 'challenge' : 'evidence',
            )}
            ”
          </blockquote>
          <p className="note">{snapshot.news.observation}</p>
          {object === 'claim' && (
            <button className="text-button" onClick={() => setObject('claimReply')}>
              The figures do not prove that headline. <ArrowRight size={14} />
            </button>
          )}
        </>
      )}
    </Dialog>
  );
  if (scene.kind === 'PROLOGUE')
    return (
      <section
        className={`narrative-scene prologue-scene beat-${scene.beat}`}
        aria-label="Playable prologue"
      >
        <SceneArt name={scene.beat === 0 ? 'gazette' : 'clara'} />
        {scene.beat === 0 ? (
          <div className="prologue-paper">
            <p className="folio">Vesper, 1892 · The opening edition</p>
            <h1>The Vesper Gazette</h1>
            <div className="paper-rule" />
            <h2>{snapshot.news.headline}</h2>
            <p className="paper-count">{snapshot.news.observation}</p>
            <button className="claim-inspect" onClick={() => setObject('claim')}>
              <Search size={15} /> “Natural differences” <span>Examine the claim</span>
            </button>
            <p className="prologue-whisper">Now try a town where you can change the rules.</p>
            <button
              className="primary"
              autoFocus
              onClick={() => onAction({ type: 'NEXT_PROLOGUE' })}
            >
              Meet Clara <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <div className="dialogue-stage">
            <p className="folio">Clara Vale · A writer in Vesper</p>
            <h1>Clara wants to write.</h1>
            <blockquote>“{citizenDialogue(snapshot, clara.id, 'situation')}”</blockquote>
            <p className="scene-record">{recordCaption(snapshot)}</p>
            <button className="object-link text-button" onClick={() => setObject('manuscript')}>
              <Search size={15} /> Examine her manuscript
            </button>
            <button
              className="primary"
              autoFocus
              onClick={() => onAction({ type: 'NEXT_PROLOGUE' })}
            >
              Speak with Clara <ArrowRight size={17} />
            </button>
          </div>
        )}
        {inspected}
      </section>
    );
  if (scene.kind === 'CHARACTER_ENCOUNTER') {
    const actor = snapshot.agents.find((agent) => agent.id === scene.actorId)!;
    const leader = snapshot.institutions.find((institution) => institution.leaderId === actor.id);
    const portrait = characterArt(actor.id);
    return (
      <section
        className={`narrative-scene encounter-scene actor-${actor.id}`}
        aria-label="Character encounter"
      >
        <SceneArt name={portrait ?? (leader?.id === 'school' ? 'school' : 'town')} />
        {!portrait && (
          <div className="generic-character">
            <Portrait agent={actor} />
          </div>
        )}
        <div className="dialogue-stage">
          <p className="folio">
            {actForWeek(world.turn)} · {world.turn ? `Week ${world.turn}` : 'Before the first week'}
          </p>
          <h1>{actor.name}</h1>
          <p className="character-role">
            {leader
              ? leader.id === 'clinic'
                ? 'Physician · The Vesper Clinic'
                : leader.id === 'gazette'
                  ? 'Editor · The Vesper Gazette'
                  : `Headmaster · ${leader.name}`
              : actor.id === clara.id
                ? 'Writer · Vesper'
                : 'A citizen of Vesper.'}
          </p>
          {scene.playerLine && <p className="player-response">You: “{scene.playerLine}”</p>}
          <blockquote
            key={`${actor.id}-${scene.topic}`}
            aria-live="polite"
            ref={replyRef}
            tabIndex={-1}
          >
            “{citizenDialogue(snapshot, actor.id, scene.topic)}”
          </blockquote>
          <p className="scene-record">
            {leader
              ? `${leader.name} · ${leader.rule} access · Week ${snapshot.turn}`
              : recordCaption(snapshot, actor.id)}
          </p>
          <div className="dialogue-choices" role="group" aria-label="Dialogue choices">
            {dialogueChoices(snapshot, actor.id, scene.topic).map(({ topic, label }) => (
              <button
                key={topic}
                data-topic={topic}
                onClick={() => onAction({ type: 'ASK', topic, line: label })}
              >
                {label}
              </button>
            ))}
          </div>
          {actor.id === clara.id && (
            <button className="text-button object-link" onClick={() => setObject('manuscript')}>
              <Search size={14} /> Examine her manuscript
            </button>
          )}
          <button className="primary" autoFocus onClick={() => onAction({ type: 'CONTINUE' })}>
            {scene.resume === 'COUNTERFACTUAL_REVEAL'
              ? 'Return to the two towns'
              : scene.roomAfter !== undefined
                ? 'Back to the upstairs room'
                : world.turn === 0
                  ? 'Step into Vesper'
                  : 'Return to the town'}{' '}
            <ArrowRight size={17} />
          </button>
          <p className="dialogue-context">
            Listen here. Choose what to send when you return to town.
          </p>
        </div>
        {inspected}
      </section>
    );
  }
  if (scene.kind === 'STORY_TURNING_POINT')
    return (
      <section className="narrative-scene turning-scene" aria-label="Story turning point">
        <SceneArt name="manuscript" />
        <div className="turning-copy">
          <p className="folio">Halfway through</p>
          <Feather size={24} />
          <h1>Count the closed doors, too.</h1>
          <p>
            {snapshot.metrics.restrictions > 0.3
              ? 'The paper counts finished work. It leaves out the people who never got time to try.'
              : 'More people have a chance to work now. Look at who got in, as well as who got printed.'}
          </p>
          <h2>Does less published work mean less ability?</h2>
          <button className="primary" autoFocus onClick={() => onAction({ type: 'CONTINUE' })}>
            Check the room again <ArrowRight size={17} />
          </button>
        </div>
      </section>
    );
  if (scene.kind === 'PATTERN_REVEAL')
    return (
      <section className="narrative-scene pattern-reveal" aria-label="The pattern beneath">
        <SceneArt name="revelation" />
        <SceneArt name="wallpaper" className="peeling-surface" />
        <div className="pattern-copy">
          <p className="folio">How a story becomes a rule</p>
          <h1>Follow the loop.</h1>
          <p className="reveal-pause">In this model, ability stays fixed. Access can change.</p>
          <ol className="causal-chain" aria-label="The feedback loop">
            {chain.map((label, index) => (
              <li key={label} style={{ animationDelay: `${index * 0.13}s` }}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {label}
                <ArrowRight size={14} />
              </li>
            ))}
          </ol>
          <p className="loop-return">That headline becomes part of next week’s story.</p>
          <button className="primary" autoFocus onClick={() => onAction({ type: 'EPILOGUE' })}>
            Return to the room <ArrowRight size={17} />
          </button>
        </div>
      </section>
    );
  if (scene.kind === 'LITERARY_EPILOGUE')
    return (
      <section className="narrative-scene epilogue-scene" aria-label="Literary epilogue">
        <SceneArt name="bedroom" />
        <div className="epilogue-copy">
          <p className="folio">The room, again</p>
          <h1>She is no longer just being dismissed.</h1>
          <h2>Her sense of reality has changed.</h2>
          <StoryQuote id="ending" />
          <p>
            John calls it care. He decides her room, her work and who she sees. At the end, she
            believes she has come out of the wallpaper. The breakdown is part of the story, not just
            a name someone gives her.
          </p>
          <p className="epilogue-nuance">
            One reading: his story sets the rules of her life, and those rules help make her world
            smaller. That is the link to nomos. The story begins with her already unwell; the town
            does not calculate her mental health.
          </p>
          <div className="epilogue-actions">
            <button className="primary" onClick={() => onRestart(false, true)}>
              Replay the story <RotateCcw size={15} />
            </button>
            <button className="text-button" onClick={() => onRestart(true)}>
              Try the other story <ArrowRight size={15} />
            </button>
            <button className="text-button" onClick={onSources}>
              About the experiment <BookOpen size={15} />
            </button>
          </div>
          <button className="text-button review-link" onClick={() => onAction({ type: 'REVIEW' })}>
            Review the two towns <ArrowRight size={14} />
          </button>
        </div>
      </section>
    );
  return null;
}

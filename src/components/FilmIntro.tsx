import { Pause, Play, SkipForward } from 'lucide-react';
import { INTRO_BEATS, quoteSource } from '../narrative/film';
import SceneArt from './SceneArt';

export default function FilmIntro({
  beat,
  paused,
  onPause,
  onSkip,
}: {
  beat: number;
  paused: boolean;
  onPause: () => void;
  onSkip: () => void;
}) {
  const shot = INTRO_BEATS[beat];
  return (
    <section className={`film-intro ${paused ? 'is-paused' : ''}`} aria-label="Opening story">
      <h1 className="sr-only" tabIndex={-1} data-scene-focus>
        The Yellow Wall-Paper
      </h1>
      <div className={`film-shot shot-${shot.id}`} key={shot.id}>
        <SceneArt name={shot.image} />
        <div className="film-shade" />
        <figure className="film-quote" aria-live="polite" aria-atomic="true">
          {shot.page ? <blockquote>“{shot.text}”</blockquote> : <p>{shot.text}</p>}
          {shot.page && (
            <figcaption>
              <a href={quoteSource(shot.page)} target="_blank" rel="noreferrer">
                {shot.speaker} · The Yellow Wall-Paper · p. {shot.page}
              </a>
            </figcaption>
          )}
        </figure>
      </div>
      <div className="film-controls">
        <button
          className="film-button"
          onClick={onPause}
          aria-label={paused ? 'Resume opening' : 'Pause opening'}
        >
          {paused ? <Play size={17} /> : <Pause size={17} />} {paused ? 'Resume' : 'Pause'}
        </button>
        <button className="film-button" onClick={onSkip} aria-label="Skip opening">
          Skip <SkipForward size={17} />
        </button>
      </div>
    </section>
  );
}

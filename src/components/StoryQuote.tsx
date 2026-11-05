import { passages, STORY_PDF, type PassageId } from '../narrative/room';

export default function StoryQuote({ id }: { id: PassageId }) {
  const passage = passages[id];
  return (
    <figure className="story-quote">
      <blockquote>“{passage.text}”</blockquote>
      <figcaption>
        <a href={`${STORY_PDF}#page=${passage.page - 646}`} target="_blank" rel="noreferrer">
          Gilman, 1892 · p. {passage.page} ↗
        </a>
      </figcaption>
    </figure>
  );
}

import { ExternalLink } from 'lucide-react';
import { ORIGINAL_PDF, passages, STORY_PDF } from '../narrative/room';
export const PRIMARY_TEXT = ORIGINAL_PDF;
export function LiteraryReturn() {
  return (
    <section className="literary-return">
      <p className="folio">A return to the room</p>
      <h2>Who gets believed?</h2>
      <p>
        John is her husband and her doctor. His view decides the room she stays in, the work she can
        do and who she sees. She has to hide her writing.
      </p>
      <div className="quotes">
        <blockquote>
          “Personally, I disagree with their ideas.”<cite>— The narrator, p. 648</cite>
        </blockquote>
        <blockquote>
          “he hates to have me write a word.”<cite>— The narrator, p. 649</cite>
        </blockquote>
      </div>
      <p>
        At the end, she believes she has come out of the wallpaper. Her world has changed. One
        reading is that the rules meant to help her have also helped trap her. She is already unwell
        at the start. The town does not model her mental health.
      </p>
      <a href={PRIMARY_TEXT} target="_blank" rel="noreferrer">
        Read Gilman’s original story (1892) <ExternalLink size={14} />
      </a>
    </section>
  );
}
export default function Sources() {
  return (
    <div className="source-notes">
      <p>
        This is an invented town and a playable reading of Charlotte Perkins Gilman’s{' '}
        <em>The Yellow Wall-Paper</em>. The numbers are model choices, not measured laws about
        people.
      </p>
      <h3>Read the words in their place</h3>
      <p>
        <a href={STORY_PDF} target="_blank" rel="noreferrer">
          Open the full original PDF <ExternalLink size={14} />
        </a>{' '}
        · January 1892, pp. 647–656. A local copy of the NLM scan is included, so it also opens
        offline.
      </p>
      <ul className="passage-index">
        {Object.entries(passages).map(([id, passage]) => (
          <li key={id}>
            <a href={`${STORY_PDF}#page=${passage.page - 646}`} target="_blank" rel="noreferrer">
              “{passage.text}” · p. {passage.page}
            </a>
          </li>
        ))}
      </ul>
      <ol>
        <li>
          <a href={PRIMARY_TEXT} target="_blank" rel="noreferrer">
            The Yellow Wall-Paper, 1892 · NLM facsimile <ExternalLink size={14} />
          </a>
          <p>
            The original magazine pages. Room passages were checked against the scans, including
            John’s answer on p. 652, the woman on p. 653 and the ending on p. 656.
          </p>
        </li>
        <li>
          <a
            href="https://www.nlm.nih.gov/exhibition/theliteratureofprescription/exhibition0.html"
            target="_blank"
            rel="noreferrer"
          >
            The Literature of Prescription · National Library of Medicine <ExternalLink size={14} />
          </a>
          <p>
            Background on the rest cure and Gilman’s story.{' '}
            <a
              href="https://www.nlm.nih.gov/exhibition/theliteratureofprescription/exhibition3.html"
              target="_blank"
              rel="noreferrer"
            >
              Further exhibit context.
            </a>
          </p>
        </li>
        <li>
          <a
            href="https://teachersinstitute.yale.edu/curriculum/units/1999/1/99.01.07/5"
            target="_blank"
            rel="noreferrer"
          >
            Why I Wrote “The Yellow Wallpaper,” 1913 · Yale reproduction <ExternalLink size={14} />
          </a>
          <p>
            Gilman explains why she wrote the story. This later account is about the author’s life;
            it is separate from what happens to her fictional narrator.
          </p>
        </li>
        <li>
          <a
            href="https://people.wku.edu/steve.groce/thesacredcanopy-berger.pdf"
            target="_blank"
            rel="noreferrer"
          >
            Peter L. Berger · The Sacred Canopy, excerpt <ExternalLink size={14} />
          </a>
          <p>
            <em>Nomos</em> means a shared order that makes the world seem settled and normal. Here,
            a repeated story becomes a rule. Living under the rule makes the story seem true.
          </p>
        </li>
        <li>
          <a
            href="https://www.ocf.berkeley.edu/~jfkihlstrom/SocialCognitionWeb/CogPerspect/CogPerspect_supp.htm"
            target="_blank"
            rel="noreferrer"
          >
            The Cognitive Perspective on Social Interaction · Berkeley <ExternalLink size={14} />
          </a>
          <p>
            How people define a situation can change what happens. A false belief can lead people to
            act in ways that seem to prove it right.
          </p>
        </li>
      </ol>
      <h3>What the model holds constant</h3>
      <p>
        48 invented adults in 24 pairs with the same starting ability. Ability and friendships stay
        fixed. Rules change who gets a chance. Practice can grow. No diagnosis is simulated.
      </p>
      <h3>What the comparison means</h3>
      <p>
        The other town starts with the same people and uses the same chance events. It receives no
        messages from you. Compare the records to see what your choices changed in this model. The
        five room scenes follow the book’s order, not the town’s eight-week clock. Clara is not
        Gilman’s unnamed narrator. Town choices do not rewrite the book’s ending.
      </p>
    </div>
  );
}

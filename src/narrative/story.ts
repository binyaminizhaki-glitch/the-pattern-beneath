import type { Decision, TurnSnapshot } from '../sim/types';
import type { DialogueTopic } from './scenes';
export type DialogueChoice = { topic: DialogueTopic; label: string };
const decisionFor = (s: TurnSnapshot, id: string) => s.decisions.find((d) => d.agentId === id)!;

// Private thoughts are fiction. Access, completed work and counts come from records.
function claraDialogue(d: Decision, topic: DialogueTopic): string {
  switch (topic) {
    case 'ambition':
      return 'Stories where someone makes one small mistake, then spends all day hiding it. People get very clever when they ought to tell the truth. I want to write those people well.';
    case 'rules':
      return d.schoolAccess && d.clinicSupported
        ? 'A place in class and time at my desk. Both, for once. I plan to use them. That is not a promise to write a great story by Saturday.'
        : d.schoolAccess
          ? 'The School admitted me. The Clinic would not recommend writing time. I can study other people’s sentences. Making my own is another matter, it seems.'
          : d.clinicSupported
            ? 'No place in class, but I got support for time at my desk. I will have to teach myself. At least I can interrupt the teacher.'
            : 'No place in class. No support for writing time. People keep saying, “Try again.” They are not the ones spending the week waiting.';
    case 'work':
      return d.published
        ? 'It is in print. Yesterday I liked the first line. Now that everyone can read it, I want to hide under the table.'
        : d.manuscript
          ? 'I finished the manuscript. Mr Grey turned it down. If it is bad, tell me where. I can fix a sentence. A flat no gives me nothing to work with.'
          : d.opportunity
            ? 'I had a chance to work. I did not finish. I wish I had a better answer, but the ending is still wrong.'
            : 'Nothing finished this week. I have a fine reply in my head. Mr Grey cannot print that.';
    case 'challenge':
      return d.published
        ? 'It means I can celebrate tonight. Tomorrow I still have to write. Please do not turn one good week into a test for the rest of my life.'
        : d.manuscript
          ? 'He may be right about the story. I want someone to argue with the work. I can change a paragraph. I cannot change being Mrs Vale.'
          : 'Of course I need practice. So do other writers. I would like time to get better without having to defend wanting it.';
    case 'evidence':
      return `${d.schoolAccess ? 'The School gave me a place' : 'The School refused me a place'}. ${d.clinicSupported ? 'The Clinic backed my writing time' : 'The Clinic did not back my writing time'}. ${d.published ? 'And you can read my printed piece.' : d.manuscript ? 'The manuscript is finished. Read it before you take sides.' : 'There is no finished piece. I will not invent one to win the argument.'}`;
    default:
      return d.published
        ? 'They printed it. I am trying not to buy another copy. Tell me if I get too pleased with myself. I have several things to say to Mr Grey.'
        : d.manuscript
          ? 'Finished, and declined. I want to change the ending. I do not want to change it just to please Mr Grey. Hard to explain that to the man with the press.'
          : !d.opportunity
            ? 'No class and no supported writing time. I am tired of being patient. If I ever write a patient person well, you will know I made them up.'
            : d.schoolAccess
              ? 'I got into class. No finished piece yet. Please do not look so disappointed. I do enough of that myself.'
              : 'No place in class, but I had time at my desk. Nothing finished yet. I would like to report a triumph. The story has other plans.';
  }
}
export function citizenDialogue(s: TurnSnapshot, actorId: string, topic: DialogueTopic): string {
  const actor = s.agents.find((a) => a.id === actorId)!;
  const own = decisionFor(s, actorId),
    clara = decisionFor(s, 'citizen-0');
  const institution = s.institutions.find((i) => i.leaderId === actorId);
  const convinced = actor.belief > 0.2,
    questioning = actor.belief < -0.2;
  if (actorId === 'citizen-0') return claraDialogue(own, topic);
  if (institution?.id === 'clinic') {
    switch (topic) {
      case 'ambition':
        return 'If my advice goes badly, I answer to the family. Not the newspaper. I want to help. I am also afraid of making things worse.';
      case 'rules':
        return institution.rule === 'restricted'
          ? questioning
            ? 'The Council still says to limit the work. I would allow more now, but my view is not the only one that counts.'
            : 'The Council says to limit the work. A woman has other duties. Wanting to write does not mean more work is good for her.'
          : institution.rule === 'partial'
            ? 'We allow some requests and refuse others. I ask what the work involves. I need to be willing to put my name to the answer.'
            : convinced
              ? 'The Council allows more than I would. The rule still stands. I will follow it, though I have my doubts.'
              : 'We hear each request now. An hour of writing and a full course are different things. We should at least ask before saying no.';
      case 'work':
        return clara.clinicSupported
          ? `We backed writing time for Mrs Vale. ${clara.published ? 'Her piece was printed. I am glad, though a newspaper cannot tell me everything about her well-being.' : clara.manuscript ? 'She finished a piece. Mr Grey refused it. I cannot promise what an editor will do.' : 'She did not finish a piece. Time to try is not a promise of a result.'}`
          : convinced
            ? 'I did not recommend writing time for Mrs Vale this week. She is unhappy with that. I still have to stand behind what I advise.'
            : 'Mrs Vale did not get our support this week. I want to look at her next request. Refusing is not always the safer choice.';
      case 'evidence':
        return `We backed writing time for ${s.decisions.filter((d) => d.clinicSupported).length} of the town’s 48 people. ${convinced ? 'I need reasons to back more requests, not just a wish for equal totals.' : 'I want to look at the refusals too. A no should have a reason.'}`;
      case 'challenge':
        return convinced
          ? 'The same care, yes. Always the same advice, no. Her duties at home do not go away because she wants to write.'
          : 'Tell me what she wants to do. “A woman wants to write” is not enough to decide either way.';
      default:
        return convinced
          ? 'Being disappointed does not mean someone has harmed you. I have to think about the strain of the work. It is easy to say yes when you are not the one giving the advice.'
          : questioning
            ? 'Useful work may help. I would rather hear what a person wants to do before telling them to stop. Listening should be part of care.'
            : 'Rest can help. Work can help. I need to know more than those two words before I advise anyone.';
    }
  }
  if (institution?.id === 'gazette') {
    switch (topic) {
      case 'ambition':
        return 'I want people to buy tomorrow’s paper. The press, the paper, the wages: all due whether my judgment was good or bad.';
      case 'rules':
        return institution.rule === 'restricted'
          ? 'Readers have expectations about who writes for us. I take those into account. I have to sell the paper as well as fill it.'
          : institution.rule === 'partial'
            ? 'I am reading work from more people. Reading it, mind you. I have not promised everyone a column.'
            : 'I judge the work itself. I will still turn people down. There is more on my desk than I can print.';
      case 'work':
        return clara.published
          ? 'We printed Mrs Vale’s piece. I hope she sends another. I will expect that one to earn its place too.'
          : clara.manuscript
            ? 'I turned down her finished manuscript. You can question my judgment. But deciding what to print is part of the job.'
            : 'There was no finished manuscript from Mrs Vale. I cannot print a piece I have not received. She can send it when it is ready.';
      case 'evidence':
        return `We received ${s.decisions.filter((d) => d.manuscript).length} finished manuscripts. We printed ${s.news.women} works by women and ${s.news.men} by men. ${s.news.frame === 'hierarchy' ? 'I did not invent the figures. You may dislike what I think they mean.' : s.news.frame === 'structural' ? 'I want to know why other pieces never reached my desk.' : 'Those are the counts. I am less sure what they prove.'}`;
      case 'challenge':
        return s.news.frame === 'hierarchy'
          ? 'You think the headline goes too far. Then what explanation would you print? I cannot fill the front page with every possible answer.'
          : 'The figures were clear. I thought their meaning was clear too. I should have asked more questions before writing that headline.';
      default:
        return s.news.frame === 'hierarchy'
          ? 'People say the headline is unkind. I meant it to be true. I cannot hide a result just because readers dislike it.'
          : s.news.frame === 'structural'
            ? 'The old headline will not do. I need to know how those pieces got to the press. “Everyone knows” is no use if I cannot back it up.'
            : 'I have the figures. I need a headline. People ask the paper to speak plainly, then complain when it says, “We do not know yet.”';
    }
  }
  if (institution?.id === 'school') {
    switch (topic) {
      case 'ambition':
        return 'A class that stays with a hard question after the first clever answer. It is harder to arrange than you might think.';
      case 'rules':
        return institution.rule === 'restricted'
          ? 'We limit places. I ask whether the course suits the person. Being keen is not the only thing that matters.'
          : institution.rule === 'partial'
            ? 'We accept some people we used to refuse. The work is still hard. A wider class need not be an easier one.'
            : 'We look at each person. Once they get in, they do the work. Expecting less would not help them.';
      case 'work':
        return clara.schoolAccess
          ? `Mrs Vale got a place this week. ${clara.manuscript ? 'She also finished a manuscript. Mr Grey can decide about printing it.' : 'No finished manuscript, but a week in class is about more than feeding the paper.'}`
          : 'Mrs Vale did not get a place this week. I know she wanted one. I still have to decide who gets in.';
      case 'evidence':
        return `We admitted ${s.decisions.filter((d) => d.schoolAccess).length} of 48 people this week. ${convinced ? 'I want to know who can manage the work before I open more places.' : 'I want to see what people do with a place before I decide who can learn.'}`;
      case 'challenge':
        return convinced
          ? 'I do not say a woman cannot have talent. I ask if this is a good use of her time, with everything else she has to do.'
          : 'If someone can do the work, give me a reason to refuse them. “We have not done it before” is not much of a reason.';
      default:
        return convinced
          ? 'A class takes time and effort. I have to ask if it suits the person, even if they would rather I did not ask.'
          : 'Keep the work hard. The doorway need not be harder. Let people show what they can do once they are inside.';
    }
  }
  const voice = Number(actorId.split('-')[1]) % 4;
  if (topic === 'ambition')
    return [
      'Finish a piece, get useful feedback, write a better one. That is enough of a plan to keep me busy.',
      'I want someone to remember my story without having to remember my name. Is that modest or vain? I cannot decide.',
      'Time I can count on. One hour that is mine beats an afternoon someone might take back.',
      'There is a story I have been thinking about for ages. I would rather show it to you than explain it.',
    ][voice];
  if (topic === 'rules' || topic === 'evidence')
    return `${own.schoolAccess ? 'I got a place in class' : 'I was refused a place in class'}. ${own.clinicSupported ? 'The Clinic backed writing time' : 'The Clinic did not back writing time'}. Now I have to work out what I can do with the week.`;
  if (topic === 'challenge')
    return convinced
      ? 'The rules have worked for me. I would need a reason to change them. Though it is easier to say that when you get a yes.'
      : 'I cannot promise everyone will write well. I want a chance to find out without defending the attempt every time.';
  return own.published
    ? 'They printed my work. I am pleased, and more nervous than I expected. Strangers can dislike it now.'
    : own.manuscript
      ? 'Finished and refused this week. I will put it away for a day before I decide what to change.'
      : own.opportunity
        ? 'I had a chance to work, but nothing finished. I wish the week had a tidier ending.'
        : 'No class, no supported writing time, no finished piece. I am working out what to try next.';
}
export function dialogueChoices(
  s: TurnSnapshot,
  actorId: string,
  topic: DialogueTopic,
): DialogueChoice[] {
  const institution = s.institutions.find((i) => i.leaderId === actorId),
    clara = decisionFor(s, 'citizen-0');
  let labels: Record<Exclude<DialogueTopic, 'situation'>, string>;
  if (institution?.id === 'clinic')
    labels = {
      ambition: 'What are you afraid will happen?',
      rules: 'Who gets the final say?',
      work: 'What did you decide for Clara?',
      challenge: 'Would you say that to a man?',
      evidence: 'Show me this week’s decisions.',
    };
  else if (institution?.id === 'gazette')
    labels = {
      ambition: 'Is this about selling papers?',
      rules: 'Who gets a place in your paper?',
      work: clara.manuscript ? 'What about Clara’s manuscript?' : 'Did Clara send you a piece?',
      challenge:
        s.news.frame === 'hierarchy'
          ? 'The figures do not prove that headline.'
          : 'Would you use the old headline again?',
      evidence: 'Show me what you printed.',
    };
  else if (institution?.id === 'school')
    labels = {
      ambition: 'What makes a good class?',
      rules: 'How do you choose who gets in?',
      work: 'Did Clara get a place?',
      challenge: 'How can she prove herself outside the door?',
      evidence: 'How many people got in?',
    };
  else if (actorId === 'citizen-0')
    labels = {
      ambition: 'What do you want to write?',
      rules: 'What did the School and Clinic say?',
      work: clara.published
        ? 'What is it like to see it in print?'
        : clara.manuscript
          ? 'What happened to your piece?'
          : 'Did you finish anything?',
      challenge: clara.published
        ? 'Does that settle it?'
        : clara.manuscript
          ? 'Maybe he just disliked the story.'
          : 'Maybe you need more practice.',
      evidence: 'What can you show me?',
    };
  else
    labels = {
      ambition: 'What do you want to make?',
      rules: 'What got in your way?',
      work: 'How did the work go?',
      challenge: 'Are the rules fair?',
      evidence: 'What happened this week?',
    };
  // Situation remains reachable after a follow-up, without adding another permanent button.
  const choices: DialogueChoice[] = (
    ['ambition', 'rules', 'work', 'challenge', 'evidence'] as const
  )
    .filter((next) => next !== topic)
    .map((next) => ({ topic: next, label: labels[next] }));
  if (topic !== 'situation') choices.push({ topic: 'situation', label: 'How are things now?' });
  return choices;
}
export function recordCaption(s: TurnSnapshot, actorId = 'citizen-0'): string {
  const d = decisionFor(s, actorId);
  return `${d.schoolAccess ? 'Class: admitted' : 'Class: refused'} · ${d.clinicSupported ? 'Writing time: backed' : 'Writing time: refused'} · ${d.published ? 'Published' : d.manuscript ? 'Finished, not printed' : 'Nothing finished'}`;
}

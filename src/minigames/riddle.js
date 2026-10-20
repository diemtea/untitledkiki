// Talk: riddles, pen-pal letters, courtroom evidence. Each question offers a few answers with a
// score (1 right / kind / convincing, 0 not). The Keen Monocle crosses out one wrong answer.
import { shuffle } from '../core/util.js';

export default {
  async run(host, p) {
    const pool = p.shuffle === false ? p.questions : shuffle([...p.questions]);
    const qs = pool.slice(0, p.count || 3);
    let score = 0;
    for (const q of qs) {
      await host.sayWait(q.q, p.who);
      let answers = q.a.map((a, i) => ({ ...a, i }));
      if (p.answerShuffle !== false) answers = shuffle(answers);
      const struck = p.sight ? answers.find((a) => !a.score) : null;
      const k = await host.choose(answers.map((a) => ({ label: a.t, disabled: a === struck, sub: a === struck ? '✗ the monocle says no' : '' })), q.prompt || '');
      const a = answers[k];
      score += a.score || 0;
      const actor = host.actor(p.actor || 'main');
      if (a.score) { host.sfx('good'); if (actor) actor.hopT = 0.4; host.fx.burst(140, 40, { n: 10 }); }
      else { host.sfx('bad'); if (actor) actor.shakeT = 0.35; }
      if (a.r) await host.sayWait(a.r, p.who);
      else if (a.score && q.right) await host.sayWait(q.right, p.who);
      else if (!a.score && q.wrong) await host.sayWait(q.wrong, p.who);
    }
    const k = score / qs.length;
    return k >= 0.99 ? 3 : k >= 0.6 ? 2 : k > 0 ? 1 : 0;
  },
};

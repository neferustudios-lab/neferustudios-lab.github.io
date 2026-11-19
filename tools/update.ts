/**
 * Weekly update (run by .github/workflows/update-answers.yml, or by hand with `npm run update`).
 * Expects fresh inputs (npm run fetch) and a passing federal check (npm run check).
 * Builds the file, and if the answers changed or the last check is older than today, writes
 * answers/v1/answers.json with dataVersion + 1 and today's date as lastVerified.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { buildAnswers } from './lib/build.ts';
import type { AnswersFile } from './lib/schema.ts';

const OUT = 'answers/v1/answers.json';
const old = JSON.parse(readFileSync(OUT, 'utf8')) as AnswersFile;
const today = new Date().toISOString().slice(0, 10);

const strip = (f: AnswersFile) => JSON.stringify({ ...f, dataVersion: 0, lastVerified: '' });
const candidate = buildAnswers(old.dataVersion, old.lastVerified);
const changed = strip(candidate) !== strip(old);

if (!changed && old.lastVerified === today) {
  console.log('No change.');
  process.exit(0);
}
const next = buildAnswers(old.dataVersion + 1, today);
writeFileSync(OUT, `${JSON.stringify(next, null, 2)}\n`);

// A short summary for the commit message.
const names = (f: AnswersFile) =>
  new Set(
    Object.values(f.jurisdictions).flatMap((j) => [
      ...j.senators.map((s) => s.name),
      ...j.houseMembers.map((h) => h.name),
      ...(j.governor ? [j.governor.name] : []),
    ]),
  );
const before = names(old);
const after = names(next);
const added = [...after].filter((n) => !before.has(n));
const removed = [...before].filter((n) => !after.has(n));
const summary = changed && (added.length || removed.length)
  ? `Answers v${next.dataVersion}: ${added.length} added, ${removed.length} removed` +
    (added.length ? `\n\nAdded: ${added.join(', ')}` : '') +
    (removed.length ? `\nRemoved: ${removed.join(', ')}` : '')
  : changed
    ? `Answers v${next.dataVersion}: checked ${today}, details changed, no name changes`
    : `Answers v${next.dataVersion}: checked ${today}, no changes`;
writeFileSync('tools/last-summary.txt', `${summary}\n`);
console.log(summary);

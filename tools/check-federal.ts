/**
 * Checks the federal officeholders in tools/input/federal.yaml against official sources.
 * Exits with an error naming every mismatch, so the weekly job stops before publishing.
 */
import { readFileSync } from 'node:fs';
import { load as yamlLoad } from 'js-yaml';
import { get } from './lib/http.ts';

type Entry = { name: string };
const federal = yamlLoad(readFileSync('tools/input/federal.yaml', 'utf8')) as Record<string, Entry>;

/** Last name, without suffixes like "Jr." */
export const lastName = (full: string) =>
  full
    .replace(/,?\s+(Jr|Sr|II|III)\.?$/i, '')
    .trim()
    .split(/\s+/)
    .pop()!
    .toLowerCase();

interface ExecPerson {
  name: { first: string; last: string; official_full?: string };
  terms: { type: 'prez' | 'viceprez'; start: string; end: string; party: string }[];
}

function currentExecutive(type: 'prez' | 'viceprez', today: string) {
  const people = yamlLoad(
    get('https://raw.githubusercontent.com/unitedstates/congress-legislators/main/executive.yaml'),
  ) as ExecPerson[];
  for (const p of people)
    for (const t of p.terms)
      if (t.type === type && t.start <= today && today < t.end) return { last: p.name.last, party: t.party };
  throw new Error(`No current ${type} in executive.yaml`);
}

const today = new Date().toISOString().slice(0, 10);
const found: Record<string, string> = {};
const prez = currentExecutive('prez', today);
found.president = prez.last;
found.vicePresident = currentExecutive('viceprez', today).last;

const house = get('https://www.house.gov/leadership');
const speaker = /alt="Speaker ([^"]+)"/.exec(house)?.[1];
if (!speaker) throw new Error('Speaker not found on house.gov/leadership. The page may have changed.');
found.speakerOfTheHouse = speaker;

const court = get('https://www.supremecourt.gov/about/biographies.aspx');
const chief = /([A-Z][A-Za-z. ]+?)(?:, Jr\.)?, Chief Justice of the United States/.exec(court)?.[1];
if (!chief) throw new Error('Chief Justice not found on supremecourt.gov. The page may have changed.');
found.chiefJustice = chief;

const problems: string[] = [];
for (const [key, name] of Object.entries(found)) {
  const ours = federal[key]?.name ?? '';
  if (lastName(ours) !== lastName(name)) problems.push(`${key}: file says "${ours}", source says "${name}"`);
}
const party = federal.presidentParty?.name.toLowerCase() ?? '';
if (!party.startsWith(prez.party.toLowerCase().replace(/^democrat$/, 'democratic')))
  problems.push(`presidentParty: file says "${federal.presidentParty?.name}", source says "${prez.party}"`);

if (problems.length) {
  console.error(`Federal officeholders changed. Update tools/input/federal.yaml:\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Federal officeholders match official sources (${Object.values(found).join(', ')}).`);

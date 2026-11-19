/** Builds the answers file from data/answers-input/. */
import { readFileSync } from 'node:fs';
import { load as yamlLoad } from 'js-yaml';
import {
  ANSWERS_SCHEMA_VERSION,
  AnswersFileSchema,
  type AnswersFile,
  type HouseMember,
  type Jurisdiction,
} from './schema.ts';

const DIR = 'tools/input';
const read = (f: string) => readFileSync(`${DIR}/${f}`, 'utf8');

interface FederalInput {
  [key: string]: unknown;
}
interface JurisdictionInput {
  name: string;
  kind: Jurisdiction['kind'];
  capital: string | null;
  capitalDistractors: string[];
}
interface LegislatorInput {
  name: string;
  type: 'sen' | 'rep';
  state: string;
  district: number | null;
}

const RESIDENT_COMMISSIONER = new Set(['PR']);

/** Minimum counts. A smaller result means a source changed format: stop instead of publishing. */
const MIN = { senators: 98, voting: 425, delegates: 6, governors: 55 };

export function buildAnswers(dataVersion: number, lastVerified: string): AnswersFile {
  const federal = yamlLoad(read('federal.yaml')) as FederalInput;
  const pick = (k: string) => {
    const e = federal[k] as { name: string; distractors: string[] };
    return { name: e.name, distractors: e.distractors };
  };
  const places = yamlLoad(read('jurisdictions.yaml')) as Record<string, JurisdictionInput>;
  const legislators = JSON.parse(read('legislators.json')) as LegislatorInput[];
  const governors = JSON.parse(read('governors.json')) as { jurisdiction: string; name: string }[];
  const govByName = new Map(
    governors.map((g) => [
      g.jurisdiction === 'Virgin Islands' ? 'U.S. Virgin Islands' : g.jurisdiction,
      g.name,
    ]),
  );

  const jurisdictions: Record<string, Jurisdiction> = {};
  for (const [code, p] of Object.entries(places)) {
    const members = legislators.filter((l) => l.state === code);
    const house: HouseMember[] = members
      .filter((l) => l.type === 'rep')
      .map((l) => ({
        name: l.name,
        district: l.district && l.district > 0 ? String(l.district) : 'At large',
        title: (p.kind === 'state'
          ? 'Representative'
          : RESIDENT_COMMISSIONER.has(code)
            ? 'Resident Commissioner'
            : 'Delegate') as HouseMember['title'],
      }))
      .sort((a, b) => Number(a.district) - Number(b.district) || a.name.localeCompare(b.name));
    const gov = p.kind === 'district' ? null : govByName.get(p.name);
    if (p.kind !== 'district' && !gov) throw new Error(`No governor found for ${p.name}`);
    jurisdictions[code] = {
      name: p.name,
      kind: p.kind,
      capital: p.capital,
      capitalDistractors: p.capitalDistractors,
      governor: gov ? { name: gov } : null,
      senators: members.filter((l) => l.type === 'sen').map((l) => ({ name: l.name })),
      houseMembers: house,
    };
  }

  const all = Object.values(jurisdictions);
  const senators = all.reduce((n, j) => n + j.senators.length, 0);
  const voting = all
    .filter((j) => j.kind === 'state')
    .reduce((n, j) => n + j.houseMembers.length, 0);
  const delegates = all
    .filter((j) => j.kind !== 'state')
    .reduce((n, j) => n + j.houseMembers.length, 0);
  const governors2 = all.filter((j) => j.governor).length;
  const problems = [
    senators < MIN.senators && `only ${senators} senators`,
    voting < MIN.voting && `only ${voting} voting House members`,
    delegates < MIN.delegates && `only ${delegates} delegates`,
    governors2 < MIN.governors && `only ${governors2} governors`,
  ].filter(Boolean);
  if (problems.length) throw new Error(`Answers look incomplete: ${problems.join(', ')}`);

  const notices = (yamlLoad(read('notices.yaml')) as unknown[] | null) ?? [];

  return AnswersFileSchema.parse({
    notices,
    schemaVersion: ANSWERS_SCHEMA_VERSION,
    dataVersion,
    lastVerified,
    federal: {
      president: pick('president'),
      vicePresident: pick('vicePresident'),
      speakerOfTheHouse: pick('speakerOfTheHouse'),
      chiefJustice: pick('chiefJustice'),
      presidentParty: pick('presidentParty'),
      supremeCourtJusticeCount: pick('supremeCourtJusticeCount'),
    },
    jurisdictions,
    sources: [
      { title: 'USCIS, Civics Test Updates', url: 'https://www.uscis.gov/citizenship/testupdates' },
      {
        title: 'The White House, Administration',
        url: 'https://www.whitehouse.gov/administration/',
      },
      {
        title: 'U.S. House of Representatives, Leadership',
        url: 'https://www.house.gov/leadership',
      },
      {
        title: 'Supreme Court of the United States, Justices',
        url: 'https://www.supremecourt.gov/about/biographies.aspx',
      },
      { title: 'National Governors Association, Governors', url: 'https://www.nga.org/governors/' },
      {
        title: 'unitedstates/congress-legislators (public domain)',
        url: 'https://github.com/unitedstates/congress-legislators',
      },
    ],
  });
}

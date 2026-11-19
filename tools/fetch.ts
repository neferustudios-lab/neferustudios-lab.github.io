/**
 * Downloads fresh officeholder data into tools/input/:
 * - legislators.json from the public-domain unitedstates/congress-legislators dataset
 * - governors.json from the National Governors Association list of current governors
 * Federal officeholders (federal.yaml) are checked by hand, see README "Updating the answers file".
 */
import { writeFileSync } from 'node:fs';
import { load as yamlLoad } from 'js-yaml';
import { get } from './lib/http.ts';


interface Term {
  type: 'sen' | 'rep';
  state: string;
  district?: number;
}
interface Legislator {
  name: { official_full?: string; first: string; last: string };
  terms: Term[];
}

const legislators = (
  yamlLoad(
    get(
      'https://raw.githubusercontent.com/unitedstates/congress-legislators/main/legislators-current.yaml',
    ),
  ) as Legislator[]
).map((p) => {
  const t = p.terms[p.terms.length - 1]!;
  return {
    name: p.name.official_full ?? `${p.name.first} ${p.name.last}`,
    type: t.type,
    state: t.state,
    district: t.district ?? null,
  };
});
writeFileSync('tools/input/legislators.json', `${JSON.stringify(legislators, null, 1)}\n`);
console.log(`legislators.json: ${legislators.length} members of Congress`);

const decode = (s: string) =>
  s
    .replace(/&#8217;|&rsquo;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .trim();
const html = get('https://www.nga.org/governors/');
const governors = [
  ...html.matchAll(/<small class="state">([^<]+)<\/small>\s*Gov\.\s*([^<]+?)\s*<\/div>/g),
].map((m) => ({ jurisdiction: decode(m[1]!), name: decode(m[2]!) }));
if (governors.length < 50)
  throw new Error(`Only ${governors.length} governors found. The NGA page may have changed.`);
writeFileSync('tools/input/governors.json', `${JSON.stringify(governors, null, 1)}\n`);
console.log(`governors.json: ${governors.length} governors`);

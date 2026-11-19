/** Checks the published answers file against the schema. */
import { readFileSync } from 'node:fs';
import { AnswersFileSchema } from './lib/schema.ts';

const f = AnswersFileSchema.parse(JSON.parse(readFileSync('answers/v1/answers.json', 'utf8')));
console.log(`answers.json valid: dataVersion ${f.dataVersion}, verified ${f.lastVerified}, ${f.notices.length} notices`);

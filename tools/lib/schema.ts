/**
 * Schema for the answers file: answers that change with elections and appointments.
 * The app bundles a copy and downloads newer versions from https://rgierges.github.io/answers/v1/answers.json.
 * Keep this file the same in both repositories: civics-mentor (content/schema/answers.ts)
 * and rgierges.github.io (tools/lib/schema.ts).
 */
import { z } from 'zod';

export const ANSWERS_SCHEMA_VERSION = 1;

const Person = z.object({ name: z.string().min(1) });

const FederalEntry = z.object({
  name: z.string().min(1),
  /** Exactly 3 wrong choices of the same kind (DECISIONS 9 and 20). */
  distractors: z.array(z.string().min(1)).length(3),
});

export const HouseMemberSchema = z.object({
  name: z.string().min(1),
  /** "1", "2", ... or "At large". */
  district: z.string().min(1),
  title: z.enum(['Representative', 'Delegate', 'Resident Commissioner']),
});
export type HouseMember = z.infer<typeof HouseMemberSchema>;

export const JurisdictionSchema = z
  .object({
    name: z.string().min(1),
    kind: z.enum(['state', 'district', 'territory']),
    capital: z.string().nullable(),
    capitalDistractors: z.array(z.string()),
    governor: Person.nullable(),
    senators: z.array(Person),
    houseMembers: z.array(HouseMemberSchema),
  })
  .superRefine((j, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: 'custom', message: `${j.name}: ${message}` });
    if (j.kind === 'state') {
      if (j.senators.length !== 2) issue(`a state needs 2 senators, has ${j.senators.length}`);
      if (!j.capital) issue('a state needs a capital');
      if (!j.governor) issue('a state needs a governor');
      if (j.capitalDistractors.length !== 3) issue('needs 3 capital distractors');
    } else {
      if (j.senators.length !== 0) issue('D.C. and territories have no U.S. senators');
    }
    if (j.kind === 'district' && (j.capital || j.governor))
      issue('D.C. has no capital and no governor');
    if (j.capital && j.capitalDistractors.includes(j.capital))
      issue('capital listed as a distractor');
  });
export type Jurisdiction = z.infer<typeof JurisdictionSchema>;

const DateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** A known upcoming change, for example a new Congress. The app shows it when the interview is on or after the date. */
export const NoticeSchema = z.object({
  date: DateString,
  /** Officeholder or state question keys the change affects. */
  keys: z
    .array(
      z.enum([
        'president',
        'vicePresident',
        'speakerOfTheHouse',
        'chiefJustice',
        'presidentParty',
        'supremeCourtJusticeCount',
        'senator',
        'representative',
        'governor',
        'capital',
      ]),
    )
    .min(1),
  text: z.string().min(1),
});
export type Notice = z.infer<typeof NoticeSchema>;

export const AnswersFileSchema = z.object({
  schemaVersion: z.literal(ANSWERS_SCHEMA_VERSION),
  /** Increases by 1 with every published change. The app takes a downloaded file only if this is higher. */
  dataVersion: z.number().int().positive(),
  /** Date the answers were last checked against official sources (YYYY-MM-DD). */
  lastVerified: DateString,
  federal: z.object({
    president: FederalEntry,
    vicePresident: FederalEntry,
    speakerOfTheHouse: FederalEntry,
    chiefJustice: FederalEntry,
    presidentParty: FederalEntry,
    supremeCourtJusticeCount: FederalEntry,
  }),
  jurisdictions: z.record(z.string().regex(/^[A-Z]{2}$/), JurisdictionSchema),
  sources: z.array(z.object({ title: z.string(), url: z.url() })),
  /** Known upcoming changes. Older files have none. */
  notices: z.array(NoticeSchema).default([]),
});
export type AnswersFile = z.infer<typeof AnswersFileSchema>;
export type FederalKey = keyof AnswersFile['federal'];

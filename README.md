# rgierges.github.io

Public site for the Civics Mentor app:

| Path | What it is |
|---|---|
| `/` | Short app page with the disclaimer and links |
| `/privacy/` | Privacy policy (linked from the app and the Play Store) |
| `/terms/` | Terms of use |
| `/answers/v1/answers.json` | Officeholder answers the app downloads (no app release needed) |

Not affiliated with USCIS or any government agency.

## How the answers file stays current

A GitHub Action (`.github/workflows/update-answers.yml`) runs every Monday:

1. Downloads current members of Congress (public-domain `unitedstates/congress-legislators`) and governors (nga.org).
2. Checks the President, Vice President, Speaker of the House, and Chief Justice in `tools/input/federal.yaml` against official sources. If one changed, the run fails and GitHub emails you. Nothing is published until you fix the file.
3. Builds the file, checks it against the schema and minimum counts (98+ senators, 425+ voting House members, 55 governors), raises `dataVersion` by 1, and sets `lastVerified` to today.
4. Commits `answers/v1/answers.json`. Apps pick it up the next time they open.

You can also run it any time: GitHub > Actions > Update answers > Run workflow.

## Update the answers by hand (for example, after an election)

Do this when the weekly run fails, or when you want a change out before Monday.

1. Open `tools/input/federal.yaml` on GitHub and tap the pencil icon.
2. Change the `name` of the officeholder who changed, for example the new Speaker.
3. Update the 3 `distractors`: use the most recent former holders of the same office. The person who just left the office goes first.
4. If a notice in `tools/input/notices.yaml` has passed and the answers are now current, delete that notice.
5. Commit the change to `main`.
6. Go to Actions > Update answers > Run workflow. Wait for the green check.
7. Open `https://rgierges.github.io/answers/v1/answers.json` and confirm the new name and a higher `dataVersion`.
8. Open the app on your phone, close it, and open it again. The question shows the new name.

New members of Congress and new governors come in automatically. You only edit `federal.yaml` for the President, Vice President, Speaker, Chief Justice, the President's party, and the number of Supreme Court justices.

### January 2027 test case

The 120th Congress starts on January 3, 2027. A notice about it is in `tools/input/notices.yaml`. The app shows it on Speaker, senator, and representative questions for users whose interview is on or after that date. After January 3: run the workflow, confirm the Speaker check, update `federal.yaml` if the Speaker changed, and delete the notice once the file is current.

## Run it on a computer

```bash
npm ci
```

```bash
npm run fetch && npm run check && npm run update && npm run validate
```

## Keep in step with the app

`tools/lib/schema.ts` must match `content/schema/answers.ts` in the civics-mentor repository. Change both together.

import { execFileSync } from 'node:child_process';

/** Downloads a page with curl (works behind proxies). Throws on HTTP errors. */
export const get = (url: string) =>
  execFileSync(
    'curl',
    ['-sSL', '--fail', '--max-time', '60', '-A', 'Mozilla/5.0 (civics-mentor data refresh)', url],
    { maxBuffer: 50 * 1024 * 1024 },
  ).toString('utf8');

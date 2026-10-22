// Draait dezelfde tests als tests.html, maar dan in de terminal: `npm test`.
import { runAllTests } from './tests.js';

const { results, info } = runAllTests();
let group = null;
for (const r of results) {
  if (r.group !== group) {
    group = r.group;
    console.log(`\n${group}`);
  }
  console.log(`  ${r.ok ? '✔' : '✘'} ${r.name}`);
  if (!r.ok) console.log(`      ${r.error}`);
}
for (const line of info) console.log(`\nℹ ${line}`);

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} van ${results.length} tests geslaagd.`);
process.exit(failed ? 1 : 0);

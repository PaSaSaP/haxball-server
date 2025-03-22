// run for example:
// HX_SELECTOR=1vs1 ts-node accu_stats/history_accu_stats.ts 2025-03-14 https://haxball.ovh
// HX_SELECTOR=3vs3 ts-node accu_stats/history_accu_stats.ts 2025-03-14 https://haxball.ovh
import { AccuStats } from ".";
import { GameModeType } from "../src/structs";
import { getTimestampHM } from "../src/utils";

if (!process.env.HX_SELECTOR) throw new Error("HX_SELECTOR is not set");
const selector = process.env.HX_SELECTOR;

console.log('HX_SELECTOR:', process.env.HX_SELECTOR);
if (!['1vs1', '3vs3', '4vs4'].includes(selector)) {
  throw new Error(`Invalid HX_SELECTOR: ${selector}`);
}
if (process.argv.length < 3) {
  console.log('Pass day ar parameter...');
  process.exit(0);
}
const day = process.argv[2];

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
if (!dateRegex.test(day)) {
  console.log('Invalid date format. Use YYYY-MM-DD.');
  process.exit(1);
}
const date = new Date(day);
const isValid = !isNaN(date.getTime()) && day === date.toISOString().split('T')[0];
if (!isValid) {
  console.log('Invalid date value. Use a valid YYYY-MM-DD date.');
  process.exit(1);
}


console.log(`${getTimestampHM()} Zaczynamy liczenie historii!`);
const mode = 'new';
let accuStats = new AccuStats(selector as GameModeType, mode);
if (process.argv.length > 3) {
  accuStats.setFetchHost(process.argv[3]);
}
accuStats.makeHistoryForDate(day);


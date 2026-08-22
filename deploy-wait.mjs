import fs from "node:fs";

const RESET_MS = 1787406702119;
const DELAY = Math.max(0, RESET_MS - Date.now() + 10000);

console.log(`Vercel rate limit resets at: ${new Date(RESET_MS).toLocaleString()}`);
console.log(`Time remaining: ${Math.round(DELAY/60000)} minutes`);
console.log(`\nRun this AFTER ${new Date(RESET_MS).toLocaleTimeString()}:`);
console.log(`  node deploy-vercel.mjs`);

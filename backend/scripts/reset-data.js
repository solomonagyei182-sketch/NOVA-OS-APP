#!/usr/bin/env node
/**
 * NOVA OS — operational data reset.
 *
 * Clears every operational record (accounts, products, companies,
 * resellers, customers, sales, stock transfers/acceptances, business
 * days, audit logs, settings) so the workspace can start completely
 * fresh. It does NOT touch the schema, migrations, or application code —
 * after running this, the app is fully functional and lands on the
 * setup wizard on next load, exactly like a brand-new deployment.
 *
 * SAFETY:
 *   - Defaults to a dry run: it only reports how many rows of each type
 *     would be deleted, without deleting anything.
 *   - To actually delete, you must pass BOTH:
 *       --yes
 *       --confirm=RESET-ALL-DATA
 *     This is deliberately awkward to fat-finger. There is no shorter form.
 *   - Prints exactly which database it's about to act on (host + database
 *     name from DATABASE_URL) before doing anything, so it's obvious
 *     which environment is targeted — this app currently has a single
 *     shared database for local dev and the deployed instance, so double-
 *     check that's really what you intend before confirming.
 *
 * Usage:
 *   node scripts/reset-data.js                                  # dry run — reports counts only
 *   node scripts/reset-data.js --yes --confirm=RESET-ALL-DATA    # actually deletes
 */

const { PrismaClient } = require('@prisma/client');

const CONFIRM_PHRASE = 'RESET-ALL-DATA';

// Deletion order matters: children before parents, respecting every
// foreign key in schema.prisma. TRUNCATE ... CASCADE would also work, but
// per-table deleteMany() gives an accurate before/after row count per
// table for the dry-run report, which TRUNCATE can't offer as cleanly.
const TABLES_IN_DELETE_ORDER = [
  'stockAcceptance',
  'stockTransfer',
  'stockMovement',
  'sale',
  'businessDay',
  'auditLog',
  'session',
  'product',
  'company',
  'reseller',
  'customer',
  'businessSettings',
  'user',
];

function parseArgs(argv) {
  const args = { yes: false, confirm: null };
  for (const arg of argv) {
    if (arg === '--yes') args.yes = true;
    else if (arg.startsWith('--confirm=')) args.confirm = arg.slice('--confirm='.length);
  }
  return args;
}

function describeDatabase(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return '(could not parse DATABASE_URL)';
  }
}

async function main() {
  const { yes, confirm } = parseArgs(process.argv.slice(2));
  const isConfirmed = yes && confirm === CONFIRM_PHRASE;

  const prisma = new PrismaClient();

  console.log('NOVA OS — operational data reset');
  console.log('Target database:', describeDatabase(process.env.DATABASE_URL || ''));
  console.log(isConfirmed ? 'Mode: LIVE — records will be deleted.' : 'Mode: DRY RUN — nothing will be deleted.');
  console.log('');

  const counts = {};
  for (const table of TABLES_IN_DELETE_ORDER) {
    counts[table] = await prisma[table].count();
  }

  console.log('Rows found:');
  for (const [table, count] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(18)} ${count}`);
  }
  console.log('');

  if (!isConfirmed) {
    console.log('This was a dry run. To actually delete this data, run:');
    console.log(`  node scripts/reset-data.js --yes --confirm=${CONFIRM_PHRASE}`);
    await prisma.$disconnect();
    return;
  }

  console.log('Deleting...');
  const deleted = {};
  for (const table of TABLES_IN_DELETE_ORDER) {
    const result = await prisma[table].deleteMany({});
    deleted[table] = result.count;
    console.log(`  ${table.padEnd(18)} deleted ${result.count}`);
  }

  console.log('');
  console.log('Done. The workspace has no accounts, products, or data left.');
  console.log('Schema and migrations are untouched — the app will show the');
  console.log('setup wizard on next load, ready to create the first Manager account.');

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error('Reset failed:', error);
  process.exit(1);
});

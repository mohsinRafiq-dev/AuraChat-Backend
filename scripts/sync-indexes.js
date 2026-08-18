/**
 * Creates every index declared in the Mongoose schemas.
 *
 * Production runs with `autoIndex: false` (see src/config/database.js), because
 * building indexes on boot is a foot-gun on a live database. That means indexes
 * must be created explicitly — including the `unique` ones, which are not just a
 * performance concern: without them, duplicate emails and duplicate direct
 * conversations are genuinely possible.
 *
 * Run once after provisioning, and again whenever a schema index changes:
 *   NODE_ENV=production node scripts/sync-indexes.js
 *
 * Safe to re-run. `syncIndexes()` also drops indexes that no longer exist in the
 * schema, so review the output on a database you care about.
 */
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.model.js';
import { Conversation } from '../src/models/Conversation.model.js';
import { Message } from '../src/models/Message.model.js';
import { Status } from '../src/models/Status.model.js';

const MODELS = { User, Conversation, Message, Status };

async function main() {
  const target = env.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.info(`Connecting to ${target}`);
  await mongoose.connect(env.mongoUri);

  let failed = false;

  for (const [name, model] of Object.entries(MODELS)) {
    if (!model) continue;
    try {
      const dropped = await model.syncIndexes();
      const current = await model.collection.indexes();
      console.info(`\n${name}`);
      if (dropped?.length) console.info(`  dropped: ${dropped.join(', ')}`);
      for (const ix of current) {
        const flags = [ix.unique && 'unique', ix.sparse && 'sparse'].filter(Boolean).join(', ');
        console.info(`  ${ix.name}${flags ? `  (${flags})` : ''}`);
      }
    } catch (err) {
      failed = true;
      console.error(`\n${name}: FAILED — ${err.message}`);
      if (err.code === 11000) {
        console.error('  A unique index could not be built because duplicate data already exists.');
        console.error('  Remove the duplicates, then re-run this script.');
      }
    }
  }

  await mongoose.disconnect();
  if (failed) {
    console.error('\nOne or more indexes failed to build.');
    process.exit(1);
  }
  console.info('\nIndexes are in sync.');
}

main().catch((err) => {
  console.error('sync-indexes failed', err);
  process.exit(1);
});

// One-off migration: moves each Test document's legacy resourceRequired/
// resourceConsumption arrays into the new single `consumption` field.
//
// Old shape (pre-reshape): resourceRequired: [{item, quantity}] (devices),
// resourceConsumption: [{item, quantity}] (consumables) — two arrays.
// New shape: consumption: [{item, rate}] — one array. A device line's
// quantity is dropped in favor of rate: 0 (a device isn't depleted per
// test run, matching normalizeConsumption()'s own convention); a
// consumable line's quantity carries over as its rate (falling back to 1
// if somehow absent).
//
// Confirmed via direct Compass inspection (2026-08-26) that test02 and
// test03 in the live qms.tests collection still carry these legacy fields
// with real data — this is not a hypothetical migration.
//
// Preview first: `npx tsx scripts/migrateTestConsumption.ts --dry-run`
// Then apply:    `npx tsx scripts/migrateTestConsumption.ts`
// Safe to re-run: documents with no legacy fields are left untouched, and
// a document already migrated (no resourceRequired/resourceConsumption
// keys left) is skipped. A document that somehow has BOTH legacy fields
// and a populated `consumption` already is flagged and skipped entirely
// (see below) rather than merged, to avoid silently duplicating lines.

import mongoose from 'mongoose';
import 'dotenv/config';

interface LegacyLine {
    item: mongoose.Types.ObjectId;
    quantity?: number;
}

interface ConsumptionLine {
    item: mongoose.Types.ObjectId;
    rate: number;
}

const run = async () => {
    const dryRun = process.argv.includes('--dry-run');
    const uri = process.env.DB_URI;
    if (!uri) {
        throw new Error('DB_URI is not set — check backend/.env');
    }

    await mongoose.connect(uri);
    // Never log the URI itself — it can carry embedded credentials.
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    if (!db) {
        throw new Error('No database handle after connect');
    }
    const collection = db.collection('tests');

    // Raw find — bypass the current Mongoose schema (which no longer
    // declares resourceRequired/resourceConsumption) so any lingering
    // legacy fields are still visible.
    const candidates = await collection
        .find({ $or: [{ resourceRequired: { $exists: true } }, { resourceConsumption: { $exists: true } }] })
        .toArray();

    console.log(`Found ${candidates.length} Test document(s) with legacy resource fields.`);

    let migrated = 0;
    let skippedMixed = 0;
    for (const doc of candidates) {
        const requiredLines: LegacyLine[] = Array.isArray(doc.resourceRequired) ? doc.resourceRequired : [];
        const consumptionLines: LegacyLine[] = Array.isArray(doc.resourceConsumption) ? doc.resourceConsumption : [];
        const existingConsumption: ConsumptionLine[] = Array.isArray(doc.consumption) ? doc.consumption : [];

        // A document carrying legacy fields AND an already-populated
        // `consumption` is an unexpected mixed state — merging would risk
        // silently duplicating lines (e.g. if consumption was already
        // migrated once, then legacy fields were somehow reintroduced).
        // Report and skip rather than guess.
        if (existingConsumption.length > 0) {
            console.warn(
                `SKIPPED ${doc.code ?? doc._id}: has both legacy resourceRequired/resourceConsumption ` +
                    `AND an existing non-empty consumption (${existingConsumption.length} line(s)) — mixed state, ` +
                    'not migrated automatically. Inspect this document manually.',
            );
            skippedMixed += 1;
            continue;
        }

        const migratedRequired: ConsumptionLine[] = requiredLines.map((l) => ({ item: l.item, rate: 0 }));
        const migratedConsumption: ConsumptionLine[] = consumptionLines.map((l) => ({ item: l.item, rate: l.quantity ?? 1 }));
        const mergedConsumption = [...migratedRequired, ...migratedConsumption];

        const label = dryRun ? '[DRY RUN] Would migrate' : 'Migrated';
        console.log(
            `${label} ${doc.code ?? doc._id}: ${requiredLines.length} device line(s) -> rate 0, ` +
                `${consumptionLines.length} consumable line(s) -> rate=quantity. New consumption:`,
            JSON.stringify(mergedConsumption),
        );

        if (!dryRun) {
            await collection.updateOne(
                { _id: doc._id },
                {
                    $set: { consumption: mergedConsumption },
                    $unset: { resourceRequired: '', resourceConsumption: '' },
                },
            );
        }
        migrated += 1;
    }

    console.log(`Done. ${dryRun ? 'Would migrate' : 'Migrated'} ${migrated} document(s). Skipped (mixed state): ${skippedMixed}.`);
};

run()
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exitCode = 1;
    })
    .finally(async () => {
        // Always disconnect, even on failure — otherwise a failed run can
        // hang the process on an open connection.
        await mongoose.disconnect();
    });

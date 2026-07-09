import mongoose, { ClientSession } from 'mongoose';

/**
 * Runs `work` inside a MongoDB transaction and returns its result.
 *
 * With `transactionAsyncLocalStorage` enabled (see connectDB), every query and
 * save executed inside `work` automatically joins this transaction's session —
 * you do NOT pass a session around. Just make your normal service calls here.
 *
 * - Commits when `work` resolves, rolls back if it throws.
 * - Auto-retries transient errors (elections, write conflicts) via the driver.
 * - `work` may be re-run on retry: keep it DB-only + idempotent (no emails /
 *   external calls inside — do those after it returns).
 * - Requires a replica set (Atlas, or a single-node RS in dev).
 */
export const withTransaction = async <T>(work: (session: ClientSession) => Promise<T>): Promise<T> => {
    let result: T;
    await mongoose.connection.transaction(async (session) => {
        result = await work(session);
    });
    return result!;
};

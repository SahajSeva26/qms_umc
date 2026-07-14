import mongoose, { ClientSession } from 'mongoose';
import { AsyncLocalStorage } from 'async_hooks';


const transactionStore = new AsyncLocalStorage<{ session: ClientSession }>();


export const withTransaction = async <T>(work: (session: ClientSession) => Promise<T>): Promise<T> => {
    // Already inside a transaction — join it, don't nest.
    const active = transactionStore.getStore();
    if (active) {
        return await work(active.session);
    }

    let result: T;
    await mongoose.connection.transaction(async (session) => {
        result = await transactionStore.run({ session }, () => work(session));
    });
    return result!;
};

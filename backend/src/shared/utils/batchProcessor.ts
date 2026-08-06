export interface BatchSuccess<T, R> {
    item: T;
    index: number;
    result: R;
}

export interface BatchFailure<T> {
    item: T;
    index: number;
    error: unknown;
}

export interface BatchProcessResult<T, R> {
    success: BatchSuccess<T, R>[];
    failed: BatchFailure<T>[];
}

export async function processInBatches<T, R>(
    items: T[],
    callback: (item: T, index: number) => Promise<R>,
    batchSize = 10,
): Promise<BatchProcessResult<T, R>> {
    const success: BatchSuccess<T, R>[] = [];
    const failed: BatchFailure<T>[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);

        const results = await Promise.allSettled(batch.map((item, batchIndex) => callback(item, i + batchIndex)));

        results.forEach((result, batchIndex) => {
            const index = i + batchIndex;
            const item: T = items[index]!;

            if (result.status === 'fulfilled') {
                success.push({
                    item,
                    index,
                    result: result.value,
                });
            } else {
                failed.push({
                    item,
                    index,
                    error: result.reason,
                });
            }
        });
    }

    return {
        success,
        failed,
    };
}

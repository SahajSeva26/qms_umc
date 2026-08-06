import { parse } from '@fast-csv/parse';
import { Readable } from 'stream';

export class CsvHelper {
    static parse(buffer: Buffer): Promise<any[]> {
        return new Promise((resolve, reject) => {
            const rows: any[] = [];

            Readable.from(buffer)
                .pipe(
                    parse({
                        headers: true,
                        trim: true,
                        ignoreEmpty: true,
                    }),
                )
                .on('error', reject)
                .on('data', (row: any) => {
                    rows.push(row);
                })
                .on('end', () => {
                    resolve(rows);
                });
        });
    }
}

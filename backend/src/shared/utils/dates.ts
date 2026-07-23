// Date helpers. All boundaries are computed in UTC so day ranges are stable regardless of server
// timezone (matches how date-only values are stored).

// 00:00:00.000 UTC of the given date's day.
export const startOfUTCDay = (date: Date | string | number): Date => {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
};

// 23:59:59.999 UTC of the given date's day.
export const endOfUTCDay = (date: Date | string | number): Date => {
    const d = new Date(date);
    d.setUTCHours(23, 59, 59, 999);
    return d;
};

// { $gte, $lte } spanning the full UTC day — ready to drop into a Mongo date query.
export const utcDayRange = (date: Date | string | number): { $gte: Date; $lte: Date } => {
    return { $gte: startOfUTCDay(date), $lte: endOfUTCDay(date) };
};

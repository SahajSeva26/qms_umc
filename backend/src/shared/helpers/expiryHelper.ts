type CalculateWorkingExpiryOptions = {
    startAt: Date; // Start time of the task
    deadlineHours: number; // Deadline of how many hours to complete the task
    workStartHour?: number; // Default: 9am
    workEndHour?: number; // Default: 6pm
    weekends?: number[]; // 0 = Sunday, 6 = Saturday
};

export function calculateWorkingExpiry({
    startAt,
    deadlineHours,
    workStartHour = 9,
    workEndHour = 18,
    weekends = [0, 6],
}: CalculateWorkingExpiryOptions): Date {
    if (deadlineHours <= 0) {
        return new Date(startAt);
    }

    const current = new Date(startAt);
    let remainingMinutes = deadlineHours * 60;

    while (remainingMinutes > 0) {
        // Skip weekends
        while (weekends.includes(current.getDay())) {
            current.setDate(current.getDate() + 1);
            current.setHours(workStartHour, 0, 0, 0);
        }

        // Before office hours
        if (current.getHours() < workStartHour) {
            current.setHours(workStartHour, 0, 0, 0);
        }

        // After office hours -> move to next working day
        if (
            current.getHours() >= workEndHour &&
            (current.getHours() > workEndHour ||
                current.getMinutes() > 0 ||
                current.getSeconds() > 0 ||
                current.getMilliseconds() > 0)
        ) {
            current.setDate(current.getDate() + 1);
            current.setHours(workStartHour, 0, 0, 0);
            continue;
        }

        // End of today's working window
        const endOfWorkDay = new Date(current);
        endOfWorkDay.setHours(workEndHour, 0, 0, 0);

        const availableMinutes = Math.floor((endOfWorkDay.getTime() - current.getTime()) / 60000);

        if (availableMinutes >= remainingMinutes) {
            current.setMinutes(current.getMinutes() + remainingMinutes);
            remainingMinutes = 0;
        } else {
            remainingMinutes -= availableMinutes;

            current.setDate(current.getDate() + 1);
            current.setHours(workStartHour, 0, 0, 0);
        }
    }

    return current;
}

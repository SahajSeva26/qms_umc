import seedSystemUser from './seedSystemUser';
import seedCounters from './seedCounters';

export const runSeed = async () => {
    await seedSystemUser();
    await seedCounters();

    //add more seed functions here
};

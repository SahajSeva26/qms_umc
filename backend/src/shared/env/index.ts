import seedSystemUser from './seedSystemUser';

export const runSeed = async () => {
    await seedSystemUser();
    //add more seed functions here
};

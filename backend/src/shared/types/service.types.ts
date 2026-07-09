import { ClientSession } from 'mongoose';

export interface IService {
    get: () => any;
    create: () => any;
    update: () => any;
    delete: () => any;
}

export interface IServiceOptions {
    populate?: boolean;
    pagination?: any;

    //transaction
    isTransaction?: boolean;
    session?: ClientSession;
}

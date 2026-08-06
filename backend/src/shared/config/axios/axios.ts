// src/integrations/common/axios.ts

import axios from 'axios';

export const axiosInstance = axios.create({
    timeout: 30_000,
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
    },
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        return Promise.reject(error);
    },
);
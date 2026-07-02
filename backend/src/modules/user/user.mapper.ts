export const UserMapper = {
    toResponse: (user: any) => {
        return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        };
    },
    toSearchResponse: (data: any) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const u of data?.items) {
            result.items.push(UserMapper.toResponse(u));
        }
        return result;
    },
};

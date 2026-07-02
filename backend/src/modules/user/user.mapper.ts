export const UserMapper = {
    toResponse: (user: any) => {
        return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
        };
    },
};

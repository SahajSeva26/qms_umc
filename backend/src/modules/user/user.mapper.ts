export const userMapper = {

    toResponse: (user: any) => {
        return {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            gender: user.gender,
            phone: user.phone,
            status: user.status,
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
            loginAttempts: user.loginAttempts,
            lastLoginAttempt: user.lastLoginAttempt,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        };
    }
    
}
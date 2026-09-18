// Employee Mapper
export const EmployeeMapper = {
    toResponse: (employee: any) => {
        return {
            id: employee._id,
            tenant: employee.tenant,
            user: employee.user,
            email: employee.email,
            phone: employee.phone,
            type: employee.type,
            doj: employee.doj,
            dol: employee.dol,
            reason: employee.reason,
            profile: employee.profile,
            supervisor: employee.supervisor,
            status: employee.status,
            meta: employee.meta,
            createdAt: employee.createdAt,
            updatedAt: employee.updatedAt,
        };
    },
    toSearchResponse: (data: any) => {
        const result = {
            count: data?.count || 0,
            items: [] as any[],
        };
        for (const employee of data?.items || []) {
            result.items.push(EmployeeMapper.toResponse(employee));
        }
        return result;
    },
};

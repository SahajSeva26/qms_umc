import { z } from "zod";
import { IUser } from "./user.model";


// //1: register ================  ====================>
// export const RegisterPayloadSchema = z.object({
//     firstName: z.string().min(1).openapi({ example: 'john' }),
//     lastName: z.string().openapi({ example: 'doe' }),
//     email: z.email().openapi({ example: 'john@example.com' }),
//     password: z.string().min(1).openapi({ example: 'Test@123' }),
// });
// export type RegisterPayloadType = z.infer<typeof RegisterPayloadSchema>;

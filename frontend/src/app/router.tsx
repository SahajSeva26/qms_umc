

import { createBrowserRouter } from "react-router-dom";
import RootLayout from "../components/layouts/RootLayout";

const appRouter = createBrowserRouter([
    {
        path: "/",
        element: <RootLayout />,
        // add all children here
        children:[]
    }
])

export default appRouter
import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "../components/login/Login";
import Register from "../components/register/Register";



const routes= createBrowserRouter([
    {
        path:"/",
        element:<Login></Login>
    },{
        path:"/register",
        element:<Register></Register>
    },{
        path:"*",
        element:<Navigate to="/" replace></Navigate>
    }
])

export default routes
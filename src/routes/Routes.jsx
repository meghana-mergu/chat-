import { createBrowserRouter, Navigate } from "react-router-dom";
import Login from "../components/login/Login";
import Register from "../components/register/Register";
import OTPVerify from "../components/otp/OtpVerify";
import ChatDashboard from "../components/chat/ChatDashboard";


const routes= createBrowserRouter([
    {
        path:"/",
        element:<Login></Login>
    },{
        path:"/register",
        element:<Register></Register>
    },{
        path:"/verify",
        element:<OTPVerify></OTPVerify>
    },{
        path:"/chat",
        element:<ChatDashboard></ChatDashboard>
    },{
        path:"*",
        element:<Navigate to="/" replace></Navigate>
    }
])

export default routes
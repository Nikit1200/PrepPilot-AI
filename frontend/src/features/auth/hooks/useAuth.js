import { useContext, useEffect } from "react";
import { AuthContext } from "../auth.context";
import {login,register,logout,getMe} from "../services/auth.api";


export const useAuth =()=>{
    const context  = useContext(AuthContext)
    const {user,setUser,loading,setLoading} = context


    const handleLogin = async({email,password})=>{
        setLoading(true)
        try{
        const data = await login({email,password})
        localStorage.setItem("token", data.token)
        setUser(data.user)
        return true
        } catch(err){
        localStorage.removeItem("token")
        setUser(null)
        return false
        } finally {
        setLoading(false)
    }
}

    const handleRegister = async({username,email,password})=>{
        setLoading(true)
        try{
        const data = await register({username,email,password})
        localStorage.setItem("token", data.token)
        setUser(data.user)
        return true
        }catch(err){
        return false

        } finally{
        setLoading(false)
    }
    }
    const handleLogout = async()=>{
        setLoading(true)
        try{
        const data = await logout()
        localStorage.removeItem("token")
        setUser(null)
        return true
        }catch(err){
        return false

        } finally{
        setLoading(false)
    }
    }

        useEffect(()=>{
            const getAndSetUser = async()=>{
                const token = localStorage.getItem("token")
                if (!token) {
                    setUser(null)
                    setLoading(false)
                    return
                }

                try{
                 const data = await getMe()
                setUser(data?.user || null)
                } catch(err){
                    localStorage.removeItem("token")
                    setUser(null)
                }finally{
                     setLoading(false)
                }
               
               
            }
            getAndSetUser()
        },[])
    return {user,loading,handleRegister,handleLogin,handleLogout}
}

import axios from "axios"

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000"

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials:true
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token")
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})


export async function register({username,email,password}){
    const response = await api.post('/api/auth/register',{
        username,email,password
 
    })
    return response.data
}

export async function login({email,password}){
        const response = await api.post("/api/auth/login",{
            email,password
       })

        return response.data

}

export async function logout(){
        const response = await api.get("/api/auth/logout",{
          
        })
        return response.data
}


export async function getMe(){
        const response = await api.get("/api/auth/get-me",{
           
        })
        return response.data
}

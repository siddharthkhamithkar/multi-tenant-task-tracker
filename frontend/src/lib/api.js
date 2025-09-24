import axios from "axios"

// Create axios instance with configurable base URL
const api = axios.create({
  baseURL: "https://api.wolfslair.in/api",
//  baseURL: "http://localhost:3001/api",
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor to add JWT token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor to handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

export default api

// JWT helper functions for token management
export const saveToken = (token) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token)
  }
}

export const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }
  return null
}

export const removeToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token")
  }
}

export const isAuthenticated = () => {
  return !!getToken()
}

// Decode JWT token to get user info (basic implementation)
export const getUserFromToken = () => {
  const token = getToken()
  if (!token) return null

  try {
    const payload = JSON.parse(atob(token.split(".")[1]))
    return payload
  } catch (error) {
    console.error("Error decoding token:", error)
    return null
  }
}

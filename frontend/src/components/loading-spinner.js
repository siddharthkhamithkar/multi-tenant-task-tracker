export default function LoadingSpinner({ size = "default", className = "" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-8 w-8",
    lg: "h-12 w-12",
  }

  return <div className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]} ${className}`} />
}

export default function NotFound() {
  return (
    <div className="error-page">
      <p className="error-code">404</p>
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or has been moved.</p>
      <a href="/">Go back home</a>
    </div>
  )
}

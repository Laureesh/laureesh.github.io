import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import "./NotFound.css";

export default function NotFound() {
  return (
    <section className="not-found section">
      <div className="container not-found-content">
        <div className="glitch-wrapper">
          <span className="glitch" data-text="404">404</span>
        </div>
        <h2>Page Not Found</h2>
        <p>The page you're looking for doesn't exist or has been moved.</p>
        <div className="not-found-actions">
          <Link to="/" className="btn btn-primary">
            <Home size={18} /> Go Home
          </Link>
          <button className="btn btn-outline" onClick={() => window.history.back()}>
            <ArrowLeft size={18} /> Go Back
          </button>
        </div>
      </div>
    </section>
  );
}

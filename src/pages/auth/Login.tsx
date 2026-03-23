import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GoogleIcon from "../../components/icons/GoogleIcon";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import "./Login.css";

export default function Login() {
  const location = useLocation();
  const loginState = (location.state as {
    from?: string;
    prefillEmail?: string;
    switchAccount?: boolean;
  } | null) ?? null;
  const [email, setEmail] = useState(loginState?.prefillEmail ?? "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { login, loginWithGoogle, error: authError } = useAuth();
  const navigate = useNavigate();
  const from = loginState?.from || "/";
  const isSwitchAccountMode = Boolean(loginState?.switchAccount);

  const displayError = localError || authError;
  const togglePasswordLabel = showPassword ? "Hide password" : "Show password";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setLocalError("Email is required");
      return;
    }

    setSubmitting(true);
    try {
      await login(trimmedEmail, password, { rememberSession: rememberMe });
      navigate(from, { replace: true });
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setLocalError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle({ rememberSession: rememberMe });
      navigate(from, { replace: true });
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-title">Sign In</h1>
        {isSwitchAccountMode ? (
          <p className="auth-subtitle">
            Enter the password for the selected account to switch without signing out first.
          </p>
        ) : null}

        {displayError && <div className="auth-error">{displayError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="Your password"
            suffix={(
              <button
                type="button"
                className="ui-input-action"
                aria-label={togglePasswordLabel}
                title={togglePasswordLabel}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          />
          <label className="auth-remember-row">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Keep me signed in on this device</span>
          </label>
          <Button type="submit" fullWidth loading={submitting}>
            Sign In
          </Button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <Button
          variant="secondary"
          fullWidth
          icon={<GoogleIcon />}
          onClick={handleGoogle}
          disabled={submitting}
        >
          Continue with Google
        </Button>

        <p className="auth-footer-text">
          Don&apos;t have an account?{" "}
          <Link to="/register" className="auth-link">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

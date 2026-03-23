import { useCallback, useMemo, useState, type FormEvent } from "react";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import GoogleIcon from "../../components/icons/GoogleIcon";
import PasswordStrengthPanel from "../../components/auth/PasswordStrengthPanel";
import TurnstileWidget from "../../components/auth/TurnstileWidget";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { useAuth } from "../../contexts/AuthContext";
import { clearSignupAttempts, formatRetryAfter, getSignupRateLimitStatus, recordSignupAttempt } from "../../utils/signupRateLimit";
import { formatPhoneNumber, normalizePhoneNumber } from "../../utils/phoneNumber";
import { evaluatePasswordStrength } from "../../utils/passwordSecurity";
import "./Register.css";

const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

export default function Register() {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const { register, loginWithGoogle, error: authError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || "/";
  const configuredTurnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim() ?? "";
  const turnstileSiteKey = configuredTurnstileSiteKey || (import.meta.env.DEV ? TURNSTILE_TEST_SITE_KEY : "");

  const displayError = localError || authError;
  const passwordStrength = useMemo(() => evaluatePasswordStrength(password), [password]);
  const phoneHint = useMemo(() => {
    if (!phoneNumber.trim()) {
      return "Optional. Add a phone number now so the account is ready for SMS-based security later.";
    }

    try {
      const normalized = normalizePhoneNumber(phoneNumber);
      return `Saved as ${formatPhoneNumber(normalized)}. This stays account-level until real SMS MFA is enabled.`;
    } catch {
      return "Use a 10-digit US number or an international number like +1 123-456-7890.";
    }
  }, [phoneNumber]);
  const showPasswordGuidance = passwordTouched || password.length > 0;
  const passwordError =
    (passwordTouched || submitting) && password.length > 0 && !passwordStrength.isValid
      ? "Choose a stronger password before continuing."
      : undefined;
  const passwordMatches = confirmPassword.length > 0 && confirmPassword === password;
  const showConfirmStatus = confirmPasswordTouched || confirmPassword.length > 0;
  const confirmError =
    (confirmPasswordTouched || submitting) && confirmPassword.length > 0 && !passwordMatches
      ? "Passwords do not match."
      : undefined;

  const togglePasswordLabel = showPassword ? "Hide password" : "Show password";
  const toggleConfirmLabel = showConfirmPassword ? "Hide confirm password" : "Show confirm password";
  const isTurnstileReady = Boolean(turnstileSiteKey);
  const isTurnstileVerified = Boolean(turnstileToken);
  const usingTurnstileTestKey = !configuredTurnstileSiteKey && turnstileSiteKey === TURNSTILE_TEST_SITE_KEY;

  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setLocalError((currentError) =>
      currentError === "Complete the Turnstile verification before creating your account."
        ? null
        : currentError,
    );
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken("");
  }, []);

  const handleTurnstileError = useCallback(() => {
    setTurnstileToken("");
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    const trimmedDisplayName = displayName.trim();
    const trimmedEmail = email.trim();
    let normalizedPhoneNumber: string | null = null;

    if (!trimmedDisplayName) {
      setLocalError("Display name is required");
      return;
    }

    if (!trimmedEmail) {
      setLocalError("Email is required");
      return;
    }

    try {
      normalizedPhoneNumber = normalizePhoneNumber(phoneNumber);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Enter a valid phone number.");
      return;
    }

    if (!isTurnstileReady) {
      setLocalError("Turnstile site key missing. Add VITE_TURNSTILE_SITE_KEY to your environment configuration.");
      return;
    }

    if (!isTurnstileVerified) {
      setLocalError("Complete the Turnstile verification before creating your account.");
      return;
    }

    if (!passwordStrength.isValid) {
      setLocalError("Use a longer, stronger password that meets every checklist item.");
      return;
    }

    if (!passwordMatches) {
      setLocalError("Passwords do not match");
      return;
    }

    const rateLimitStatus = getSignupRateLimitStatus();

    if (rateLimitStatus.blocked) {
      setLocalError(`Too many signup attempts. Try again in ${formatRetryAfter(rateLimitStatus.retryAfterMs)}.`);
      return;
    }

    setSubmitting(true);
    recordSignupAttempt();

    try {
      await register(trimmedEmail, password, trimmedDisplayName, {
        phoneNumber: normalizedPhoneNumber,
      });
      clearSignupAttempts();
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
      await loginWithGoogle();
      navigate(from, { replace: true });
    } catch {
      // error is set in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseSuggestion = (suggestion: string) => {
    setPassword(suggestion);
    setConfirmPassword("");
    setPasswordTouched(true);
    setConfirmPasswordTouched(false);
    setShowPassword(true);
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--register">
        <h1 className="auth-title">Create Account</h1>

        {displayError && <div className="auth-error">{displayError}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            autoComplete="name"
            placeholder="Your name"
          />
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
            label="Phone Number"
            type="tel"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            autoComplete="tel"
            inputMode="tel"
            placeholder="+1 123-456-7890"
            hint={phoneHint}
          />
          <Input
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            required
            autoComplete="new-password"
            placeholder="Create a strong password"
            error={passwordError}
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

          <PasswordStrengthPanel
            password={password}
            visible={showPasswordGuidance}
            onUseSuggestion={handleUseSuggestion}
          />

          <Input
            label="Confirm Password"
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              if (!confirmPasswordTouched) {
                setConfirmPasswordTouched(true);
              }
            }}
            onBlur={() => setConfirmPasswordTouched(true)}
            required
            autoComplete="new-password"
            placeholder="Re-enter your password"
            error={confirmError}
            suffix={(
              <button
                type="button"
                className="ui-input-action"
                aria-label={toggleConfirmLabel}
                title={toggleConfirmLabel}
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            )}
          />

          {showConfirmStatus && confirmPassword ? (
            <p
              className={`auth-confirm-status ${passwordMatches ? "auth-confirm-status--match" : "auth-confirm-status--mismatch"}`}
            >
              {passwordMatches ? <Check size={14} /> : <X size={14} />}
              {passwordMatches ? "Passwords match." : "Passwords do not match yet."}
            </p>
          ) : null}

          <p className="auth-security-note">
            Use a long memorable passphrase with a symbol and number. This app never stores raw passwords in plain text.
          </p>

          {isTurnstileReady ? (
            <>
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onSuccess={handleTurnstileSuccess}
                onExpire={handleTurnstileExpire}
                onError={handleTurnstileError}
              />
              {usingTurnstileTestKey ? (
                <p className="auth-turnstile-missing">
                  Using Cloudflare&apos;s test Turnstile key for local development. Add{" "}
                  <code>VITE_TURNSTILE_SITE_KEY</code> to your environment configuration before deploying.
                </p>
              ) : null}
            </>
          ) : (
            <p className="auth-turnstile-missing">
              Turnstile is not configured yet. Add <code>VITE_TURNSTILE_SITE_KEY</code> to your environment configuration.
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            loading={submitting}
            disabled={!isTurnstileReady || !isTurnstileVerified}
          >
            Create Account
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
          Already have an account?{" "}
          <Link to="/login" className="auth-link">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

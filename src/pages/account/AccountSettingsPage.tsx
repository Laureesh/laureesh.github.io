import { useEffect, useState } from "react";
import {
  multiFactor,
  sendPasswordResetEmail,
  TotpMultiFactorGenerator,
  type MultiFactorInfo,
  type TotpSecret,
} from "firebase/auth";
import { Button, Checkbox, Input, Modal, Textarea } from "../../components/ui";
import { ADMIN_IDLE_TIMEOUT_MINUTES, ADMIN_TOTP_ISSUER } from "../../config/security";
import { useAuth } from "../../contexts/AuthContext";
import { auth } from "../../firebase/config";
import { updateUserProfile } from "../../services/userProfiles";
import {
  formatPhoneNumber,
  maskPhoneNumber,
  normalizePhoneNumber,
} from "../../utils/phoneNumber";
import AccountPageLayout from "./AccountPageLayout";

const TOTP_SETUP_COPY =
  "Firebase web TOTP MFA is real, but it only works after Firebase Authentication with Identity Platform and the TOTP provider are enabled for this project. This screen now uses the real Firebase MFA APIs instead of a fake OTP preview.";

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unavailable";
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleString();
}

function formatRemainingTime(value: number | null) {
  if (value == null) {
    return "Inactive";
  }

  const totalSeconds = Math.max(Math.ceil(value / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getAdminMfaErrorMessage(error: unknown) {
  if (
    typeof error === "object"
    && error !== null
    && "code" in error
    && typeof error.code === "string"
  ) {
    if (error.code === "auth/requires-recent-login") {
      return "Firebase requires a recent sign-in before changing admin MFA. Sign out, sign back in, then retry the TOTP setup.";
    }

    if (
      error.code === "auth/operation-not-allowed"
      || error.code === "auth/admin-restricted-operation"
    ) {
      return "TOTP MFA is not enabled for this Firebase project yet. Turn on Identity Platform and enable the TOTP provider in Firebase Authentication before retrying.";
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Unable to update admin MFA right now.";
}

function getFactorLabel(factor: MultiFactorInfo) {
  if (factor.displayName?.trim()) {
    return factor.displayName.trim();
  }

  if (factor.factorId === TotpMultiFactorGenerator.FACTOR_ID) {
    return "Authenticator app";
  }

  return factor.factorId;
}

export default function AccountSettingsPage() {
  const {
    user,
    userProfile,
    refreshUserProfile,
    refreshAuthUser,
    sendVerificationEmail,
    adminSessionTimeRemainingMs,
  } = useAuth();
  const [username, setUsername] = useState(userProfile?.username ?? "");
  const [location, setLocation] = useState(userProfile?.location ?? "");
  const [phoneNumberInput, setPhoneNumberInput] = useState(
    formatPhoneNumber(userProfile?.phoneNumber ?? null),
  );
  const [security, setSecurity] = useState(
    userProfile?.preferences.security ?? {
      loginAlerts: true,
      trustedDevicesOnly: false,
    },
  );
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [refreshingVerification, setRefreshingVerification] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [securityActionStatus, setSecurityActionStatus] = useState<string | null>(null);
  const [securityActionStatusType, setSecurityActionStatusType] = useState<"success" | "error" | null>(null);
  const [totpModalOpen, setTotpModalOpen] = useState(false);
  const [totpSecret, setTotpSecret] = useState<TotpSecret | null>(null);
  const [totpDisplayName, setTotpDisplayName] = useState("Primary authenticator");
  const [totpCode, setTotpCode] = useState("");
  const [totpStatus, setTotpStatus] = useState<string | null>(null);
  const [totpStatusType, setTotpStatusType] = useState<"success" | "error" | null>(null);
  const [totpStarting, setTotpStarting] = useState(false);
  const [totpSaving, setTotpSaving] = useState(false);
  const [totpRemovingUid, setTotpRemovingUid] = useState<string | null>(null);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setUsername(userProfile.username ?? "");
    setLocation(userProfile.location ?? "");
    setPhoneNumberInput(formatPhoneNumber(userProfile.phoneNumber));
    setSecurity(userProfile.preferences.security);
  }, [userProfile]);

  const providerLabels = user?.providerData
    .map((provider) => {
      if (provider.providerId === "google.com") return "Google";
      if (provider.providerId === "password") return "Email and password";
      return provider.providerId;
    })
    .filter(Boolean) ?? [];
  const hasPasswordProvider = user?.providerData.some((provider) => provider.providerId === "password") ?? false;
  const isAdmin = userProfile?.role === "admin";
  const enrolledFactors = user ? multiFactor(user).enrolledFactors : [];
  const totpFactors = enrolledFactors.filter(
    (factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID,
  );

  if (!user || !userProfile) {
    return null;
  }

  let normalizedPhoneNumber: string | null = null;
  let phoneHint = "Optional. Store a phone number for recovery and future contact-based security flows.";

  try {
    normalizedPhoneNumber = normalizePhoneNumber(phoneNumberInput);
    if (normalizedPhoneNumber) {
      phoneHint = `Stored as ${formatPhoneNumber(normalizedPhoneNumber)}. The app now treats this as recovery/contact data instead of pretending SMS MFA is already enforced.`;
    }
  } catch {
    if (phoneNumberInput.trim()) {
      phoneHint = "Use a 10-digit US number or an international number like +1 123-456-7890.";
    }
  }

  const totpQrCodeUrl = totpSecret
    ? totpSecret.generateQrCodeUrl(user.email ?? user.uid, ADMIN_TOTP_ISSUER)
    : "";
  const sessionCountdown = formatRemainingTime(adminSessionTimeRemainingMs);
  const mfaStatusLabel = isAdmin
    ? totpFactors.length
      ? `${totpFactors.length} factor${totpFactors.length === 1 ? "" : "s"} enrolled`
      : user.emailVerified
        ? "Ready to enroll"
        : "Verify email first"
    : "Not required";

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    setStatusType(null);

    let nextPhoneNumber: string | null = null;

    try {
      nextPhoneNumber = normalizePhoneNumber(phoneNumberInput);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Enter a valid phone number.");
      setStatusType("error");
      setSaving(false);
      return;
    }

    try {
      await updateUserProfile(user.uid, {
        username: username.trim() || null,
        location: location.trim() || null,
        phoneNumber: nextPhoneNumber,
        preferences: {
          ...userProfile.preferences,
          security,
        },
      });

      await refreshUserProfile();
      setPhoneNumberInput(formatPhoneNumber(nextPhoneNumber));
      setStatus("Account settings saved.");
      setStatusType("success");
    } catch {
      setStatus("Unable to save account settings.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSendPasswordReset = async () => {
    if (!user.email) {
      return;
    }

    try {
      await sendPasswordResetEmail(auth, user.email);
      setSecurityActionStatusType("success");
      setSecurityActionStatus("Password reset email sent.");
    } catch {
      setSecurityActionStatusType("error");
      setSecurityActionStatus("Unable to send password reset email right now.");
    }
  };

  const handleSendVerification = async () => {
    setVerifying(true);
    try {
      await sendVerificationEmail();
      setSecurityActionStatusType("success");
      setSecurityActionStatus("Verification email sent. Check your inbox, spam, or promotions tab.");
    } catch (error) {
      setSecurityActionStatusType("error");
      setSecurityActionStatus(
        error instanceof Error ? error.message : "Unable to send verification email right now.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleRefreshVerification = async () => {
    setRefreshingVerification(true);

    try {
      await refreshAuthUser();
      setSecurityActionStatusType("success");
      setSecurityActionStatus(
        auth.currentUser?.emailVerified
          ? "Email verification status refreshed."
          : "Still waiting for verification. Open the email link first, then refresh here.",
      );
    } catch {
      setSecurityActionStatusType("error");
      setSecurityActionStatus("Unable to refresh verification status right now.");
    } finally {
      setRefreshingVerification(false);
    }
  };

  const resetTotpSetup = () => {
    setTotpSecret(null);
    setTotpDisplayName("Primary authenticator");
    setTotpCode("");
    setTotpStatus(null);
    setTotpStatusType(null);
  };

  const handleOpenTotpModal = async () => {
    if (!isAdmin) {
      return;
    }

    if (!user.emailVerified) {
      setSecurityActionStatusType("error");
      setSecurityActionStatus("Verify your email before enrolling admin MFA.");
      return;
    }

    setTotpStarting(true);
    setSecurityActionStatus(null);
    setSecurityActionStatusType(null);
    resetTotpSetup();

    try {
      const session = await multiFactor(user).getSession();
      const secret = await TotpMultiFactorGenerator.generateSecret(session);

      setTotpSecret(secret);
      setTotpModalOpen(true);
    } catch (error) {
      setSecurityActionStatusType("error");
      setSecurityActionStatus(getAdminMfaErrorMessage(error));
    } finally {
      setTotpStarting(false);
    }
  };

  const handleEnrollTotp = async () => {
    if (!totpSecret) {
      return;
    }

    setTotpSaving(true);
    setTotpStatus(null);
    setTotpStatusType(null);

    try {
      const code = totpCode.trim();

      if (!code) {
        throw new Error("Enter the current code from your authenticator app.");
      }

      const assertion = TotpMultiFactorGenerator.assertionForEnrollment(totpSecret, code);
      await multiFactor(user).enroll(assertion, totpDisplayName.trim() || "Authenticator app");
      await refreshAuthUser();
      setTotpModalOpen(false);
      resetTotpSetup();
      setSecurityActionStatusType("success");
      setSecurityActionStatus("Authenticator app enrolled for admin MFA.");
    } catch (error) {
      setTotpStatus(getAdminMfaErrorMessage(error));
      setTotpStatusType("error");
    } finally {
      setTotpSaving(false);
    }
  };

  const handleRemoveFactor = async (factor: MultiFactorInfo) => {
    const confirmed = window.confirm(
      `Remove ${getFactorLabel(factor)} from this admin account? This weakens the account until another MFA factor is enrolled.`,
    );

    if (!confirmed) {
      return;
    }

    setTotpRemovingUid(factor.uid);
    setSecurityActionStatus(null);
    setSecurityActionStatusType(null);

    try {
      await multiFactor(user).unenroll(factor);
      await refreshAuthUser();
      setSecurityActionStatusType("success");
      setSecurityActionStatus("Admin MFA factor removed.");
    } catch (error) {
      setSecurityActionStatusType("error");
      setSecurityActionStatus(getAdminMfaErrorMessage(error));
    } finally {
      setTotpRemovingUid(null);
    }
  };

  return (
    <AccountPageLayout
      eyebrow="Account"
      title="Account Settings"
      description="Manage the account details that control identity, baseline account security, and the extra protections required for admin access."
      sidebar={(
        <>
          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Security basics</h3>
            </div>
            <ul className="account-security-list">
              <li className="account-security-item"><strong>Role</strong><span>{userProfile.role}</span></li>
              <li className="account-security-item"><strong>Status</strong><span>{userProfile.status}</span></li>
              <li className="account-security-item"><strong>Email verified</strong><span>{user.emailVerified ? "Yes" : "No"}</span></li>
              <li className="account-security-item"><strong>Phone</strong><span>{maskPhoneNumber(normalizedPhoneNumber ?? userProfile.phoneNumber)}</span></li>
              <li className="account-security-item"><strong>Admin MFA</strong><span>{mfaStatusLabel}</span></li>
              <li className="account-security-item"><strong>Admin timeout</strong><span>{isAdmin ? sessionCountdown : "Standard session"}</span></li>
              <li className="account-security-item"><strong>Created</strong><span>{formatDate(user.metadata.creationTime)}</span></li>
              <li className="account-security-item"><strong>Last sign-in</strong><span>{formatDate(user.metadata.lastSignInTime)}</span></li>
            </ul>
          </div>

          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Connected sign-in methods</h3>
              <p>These come from Firebase Authentication and explain how this account can currently log in.</p>
            </div>
            <div className="account-chip-row">
              {providerLabels.length > 0 ? (
                providerLabels.map((providerLabel) => (
                  <span key={providerLabel} className="account-chip">{providerLabel}</span>
                ))
              ) : (
                <span className="account-chip">Primary provider unavailable</span>
              )}
            </div>
          </div>
        </>
      )}
    >
      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Identity and routing</h2>
          </div>
          <p>Set the account-level fields that matter across profile links, future dashboards, and portfolio discovery.</p>
        </div>

        <div className="account-form-grid">
          <Input
            label="Account Email"
            value={user.email ?? ""}
            disabled
            hint="Email is managed by Firebase Authentication."
          />
          <Input
            label="Role"
            value={userProfile.role}
            disabled
            hint="Role changes are controlled by protected bootstrap/admin flows."
          />
          <Input
            label="Username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="your-handle"
          />
          <Input
            label="Location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="City, State"
          />
          <Input
            label="Phone Number"
            type="tel"
            value={phoneNumberInput}
            onChange={(event) => setPhoneNumberInput(event.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="+1 123-456-7890"
            className="account-field-full"
            hint={phoneHint}
          />
        </div>
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Security basics</h2>
          </div>
          <p>These preferences stay editable for every account, while the admin-only controls below are enforced through Firebase Auth and Firestore checks.</p>
        </div>

        <div className="account-toggle-grid">
          <Checkbox
            label="Send login alerts"
            description="Notify this account when a new sign-in happens or when a remembered device changes."
            checked={security.loginAlerts}
            onChange={(event) =>
              setSecurity((current) => ({ ...current, loginAlerts: event.target.checked }))
            }
          />
          <Checkbox
            label="Prefer trusted devices only"
            description="Store the preference now so later security flows can require extra checks on unfamiliar devices."
            checked={security.trustedDevicesOnly}
            onChange={(event) =>
              setSecurity((current) => ({ ...current, trustedDevicesOnly: event.target.checked }))
            }
          />
        </div>

        <div className="account-note-box">
          Email verification is now part of the admin route gate, and admin sessions automatically sign out after {ADMIN_IDLE_TIMEOUT_MINUTES} minutes of inactivity.
        </div>

        {isAdmin ? (
          <div className="account-session-timer">
            <span className="account-session-timer__label">Admin session expires in</span>
            <strong>{sessionCountdown}</strong>
            <span>Any typing, click, tap, scroll, or focus resets the timer.</span>
          </div>
        ) : null}
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Admin MFA</h2>
          </div>
          <p>Admin accounts should use a real second factor. This page now uses Firebase Auth’s actual TOTP enrollment APIs instead of a mock OTP preview.</p>
        </div>

        <div className="account-panel account-panel--nested">
          <div className="account-panel-header">
            <div className="account-panel-title-row">
              <h3>Authenticator app setup</h3>
            </div>
            <p>{isAdmin ? "Use TOTP MFA for admin access once your Firebase project is configured for it." : "This account does not need admin MFA because it does not have admin access."}</p>
          </div>

          <div className="account-chip-row">
            <span className="account-chip">{user.emailVerified ? "Email verified" : "Email verification required"}</span>
            <span className="account-chip">{totpFactors.length ? `${totpFactors.length} factor${totpFactors.length === 1 ? "" : "s"} enrolled` : "No TOTP factor enrolled"}</span>
            <span className="account-chip">{isAdmin ? `Session ${sessionCountdown}` : "Member session"}</span>
          </div>

          <div className="account-note-box">
            {TOTP_SETUP_COPY}
          </div>

          {isAdmin ? (
            <>
              {totpFactors.length ? (
                <div className="account-security-factor-list">
                  {totpFactors.map((factor) => (
                    <div key={factor.uid} className="account-security-factor">
                      <div>
                        <strong>{getFactorLabel(factor)}</strong>
                        <span>{factor.factorId === TotpMultiFactorGenerator.FACTOR_ID ? "Authenticator app factor" : factor.factorId}</span>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => void handleRemoveFactor(factor)}
                        loading={totpRemovingUid === factor.uid}
                        disabled={totpRemovingUid !== null && totpRemovingUid !== factor.uid}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="account-empty-state">
                  No admin TOTP factor is enrolled yet.
                </div>
              )}

              <div className="account-actions">
                <Button
                  variant="secondary"
                  onClick={() => void handleOpenTotpModal()}
                  loading={totpStarting}
                  disabled={!user.emailVerified}
                >
                  Start TOTP setup
                </Button>
                {!user.emailVerified ? (
                  <span className="account-status-text">
                    Verify your email first, then retry TOTP enrollment.
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <div className="account-note-box">
              Admin MFA is only required for admin accounts. Member accounts can keep using the other account security controls on this page without seeing protected admin routes.
            </div>
          )}
        </div>

        <div className="account-note-box">
          Firestore and admin services now validate admin access on the backend side as well, so the app no longer depends on frontend hiding alone to protect private admin actions.
        </div>

        <div className="account-actions">
          <Button onClick={() => void handleSave()} loading={saving}>Save account settings</Button>
          {!user.emailVerified ? (
            <Button variant="secondary" onClick={() => void handleSendVerification()} loading={verifying}>
              Send verification email
            </Button>
          ) : null}
          {!user.emailVerified ? (
            <Button variant="ghost" onClick={() => void handleRefreshVerification()} loading={refreshingVerification}>
              Refresh verification status
            </Button>
          ) : null}
          {hasPasswordProvider ? (
            <Button variant="ghost" onClick={() => void handleSendPasswordReset()}>
              Send password reset email
            </Button>
          ) : null}
          {status ? (
            <span className={`account-status-text ${statusType === "error" ? "is-error" : statusType === "success" ? "is-success" : ""}`}>
              {status}
            </span>
          ) : null}
          {securityActionStatus ? (
            <span className={`account-status-text ${securityActionStatusType === "error" ? "is-error" : securityActionStatusType === "success" ? "is-success" : ""}`}>
              {securityActionStatus}
            </span>
          ) : null}
        </div>
      </div>

      <Modal
        open={totpModalOpen}
        onClose={() => {
          setTotpModalOpen(false);
          resetTotpSetup();
        }}
        title="Enroll authenticator app"
        size="md"
        footer={(
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setTotpModalOpen(false);
                resetTotpSetup();
              }}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleEnrollTotp()} loading={totpSaving} disabled={!totpSecret || !totpCode.trim()}>
              Enroll factor
            </Button>
          </>
        )}
      >
        <div className="account-photo-editor">
          <p className="account-panel-description">
            Add this account to your authenticator app, then enter the current one-time code to finish enrollment.
          </p>

          <div className="account-note-box">
            {totpSecret ? (
              <>
                <strong>Secret key</strong>
                <div className="account-mfa-secret">{totpSecret.secretKey}</div>
                <div className="account-security-meta">
                  <span>Algorithm: {totpSecret.hashingAlgorithm}</span>
                  <span>Digits: {totpSecret.codeLength}</span>
                  <span>Period: {totpSecret.codeIntervalSeconds}s</span>
                </div>
              </>
            ) : (
              "Preparing your TOTP enrollment secret..."
            )}
          </div>

          <Textarea
            label="Authenticator URI"
            value={totpQrCodeUrl}
            readOnly
            rows={4}
            hint="If your authenticator app supports importing otpauth:// URIs, paste this value there. Otherwise use the secret key above for manual entry."
          />

          <Input
            label="Factor label"
            value={totpDisplayName}
            onChange={(event) => setTotpDisplayName(event.target.value)}
            placeholder="Primary authenticator"
            hint="This label will help you identify the factor later."
          />

          <Input
            label="Current 6-digit code"
            value={totpCode}
            onChange={(event) => setTotpCode(event.target.value.replace(/\s+/g, ""))}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            hint="Enter the code shown by your authenticator app for this newly added account."
          />

          <div className="account-note-box">
            {TOTP_SETUP_COPY}
          </div>

          {totpStatus ? (
            <span className={`account-status-text ${totpStatusType === "error" ? "is-error" : totpStatusType === "success" ? "is-success" : ""}`}>
              {totpStatus}
            </span>
          ) : null}
        </div>
      </Modal>
    </AccountPageLayout>
  );
}

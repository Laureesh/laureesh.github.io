import { useEffect, useMemo, useState } from "react";
import { RefreshCcw, UserRound, Users2 } from "lucide-react";
import { Button, Input, Select } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import { listAdminUsers, removeManagedUserAccess, updateManagedUser } from "../../services/adminUsers";
import type { UserProfile, UserRole, UserStatus } from "../../types/models";

const ROLE_FILTER_OPTIONS = [
  { value: "all", label: "All roles" },
  { value: "admin", label: "Admins" },
  { value: "member", label: "Members" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

const ROLE_OPTIONS = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "banned", label: "Banned" },
];

function formatTimestamp(value: UserProfile["updatedAt"] | UserProfile["createdAt"]) {
  try {
    return value.toDate().toLocaleString();
  } catch {
    return "Unavailable";
  }
}

function matchesSearch(user: UserProfile, query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [
    user.displayName,
    user.email,
    user.username ?? "",
    user.headline,
    user.location ?? "",
    user.role,
    user.status,
    ...user.skills,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export default function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [draftRole, setDraftRole] = useState<UserRole>("member");
  const [draftStatus, setDraftStatus] = useState<UserStatus>("active");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);

  const loadUsers = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setStatusMessage(null);
    setStatusType(null);

    try {
      const records = await listAdminUsers();
      setUsers(records);
    } catch {
      setStatusMessage("Unable to load users right now.");
      setStatusType("error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((managedUser) => {
      if (!matchesSearch(managedUser, search)) {
        return false;
      }

      if (roleFilter !== "all" && managedUser.role !== roleFilter) {
        return false;
      }

      if (statusFilter !== "all" && managedUser.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [roleFilter, search, statusFilter, users]);

  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId(null);
      return;
    }

    if (!selectedUserId || !filteredUsers.some((managedUser) => managedUser.uid === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].uid);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser = filteredUsers.find((managedUser) => managedUser.uid === selectedUserId) ?? null;
  const isCurrentAdmin = Boolean(selectedUser && user && selectedUser.uid === user.uid);

  useEffect(() => {
    if (!selectedUser) {
      return;
    }

    setDraftRole(selectedUser.role);
    setDraftStatus(selectedUser.status);
  }, [selectedUser]);

  const totalAdmins = users.filter((managedUser) => managedUser.role === "admin").length;
  const restrictedUsers = users.filter((managedUser) => managedUser.status !== "active").length;

  const handleSave = async () => {
    if (!selectedUser) {
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setStatusType(null);

    try {
      const updatedUser = await updateManagedUser(selectedUser.uid, {
        role: draftRole,
        status: draftStatus,
      });

      setUsers((currentUsers) =>
        currentUsers.map((managedUser) =>
          managedUser.uid === selectedUser.uid && updatedUser ? updatedUser : managedUser,
        ),
      );
      setStatusMessage("User access updated.");
      setStatusType("success");
    } catch {
      setStatusMessage("Unable to save user changes right now.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveAccess = async () => {
    if (!selectedUser || isCurrentAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Remove platform access for ${selectedUser.displayName || selectedUser.email}? This will ban the user, demote them to member, and hide their public portfolio.`,
    );

    if (!confirmed) {
      return;
    }

    setRemoving(true);
    setStatusMessage(null);
    setStatusType(null);

    try {
      const updatedUser = await removeManagedUserAccess(selectedUser.uid);

      setUsers((currentUsers) =>
        currentUsers.map((managedUser) =>
          managedUser.uid === selectedUser.uid && updatedUser ? updatedUser : managedUser,
        ),
      );
      setStatusMessage("User access removed. Their user document remains for auditability, but the account is now banned and hidden.");
      setStatusType("success");
    } catch {
      setStatusMessage("Unable to remove user access right now.");
      setStatusType("error");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="admin-panel-stack">
      <section className="admin-panel admin-panel--hero">
        <div className="admin-panel__header">
          <p className="admin-panel__eyebrow">User Management</p>
          <div className="admin-panel__title-row">
            <Users2 size={18} />
            <h2>Manage members and admins</h2>
          </div>
          <p>
            Review the full users collection, filter it quickly, and control role/status access from one protected admin surface.
          </p>
        </div>

        <div className="admin-stat-grid">
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Users loaded</span>
            <strong>{users.length}</strong>
            <span>Total Firestore user profiles available to this admin view</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Admins</span>
            <strong>{totalAdmins}</strong>
            <span>Accounts with elevated dashboard access</span>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-card__label">Restricted</span>
            <strong>{restrictedUsers}</strong>
            <span>Suspended or banned accounts</span>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <h2>Search and filters</h2>
          <p>Filter the full user list before selecting a record to manage.</p>
        </div>

        <div className="admin-users__toolbar">
          <Input
            label="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, username, email, skill, role, or status"
            className="admin-users__search"
          />
          <Select
            label="Role"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            options={ROLE_FILTER_OPTIONS}
          />
          <Select
            label="Status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            options={STATUS_FILTER_OPTIONS}
          />
          <div className="admin-users__toolbar-action">
            <Button
              variant="secondary"
              icon={<RefreshCcw size={15} />}
              onClick={() => void loadUsers(true)}
              loading={refreshing}
            >
              Refresh
            </Button>
          </div>
        </div>
      </section>

      <section className="admin-users__workspace">
        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>User list</h2>
            <p>{filteredUsers.length} result{filteredUsers.length === 1 ? "" : "s"} after filters.</p>
          </div>

          {loading ? (
            <div className="admin-empty-state">Loading users...</div>
          ) : filteredUsers.length ? (
            <div className="admin-users__list">
              {filteredUsers.map((managedUser) => (
                <button
                  key={managedUser.uid}
                  type="button"
                  className={`admin-user-card ${managedUser.uid === selectedUserId ? "is-selected" : ""}`}
                  onClick={() => setSelectedUserId(managedUser.uid)}
                >
                  <span className="admin-user-card__avatar">
                    {managedUser.photoURL ? (
                      <img src={managedUser.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <UserRound size={16} />
                    )}
                  </span>
                  <span className="admin-user-card__copy">
                    <strong>{managedUser.displayName || managedUser.email}</strong>
                    <span>{managedUser.email}</span>
                    <span>{managedUser.username ? `@${managedUser.username}` : "No username set"}</span>
                  </span>
                  <span className="admin-user-card__meta">
                    <span className={`admin-status-pill is-${managedUser.role}`}>{managedUser.role}</span>
                    <span className={`admin-status-pill is-${managedUser.status}`}>{managedUser.status}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="admin-empty-state">No users match the current filters.</div>
          )}
        </div>

        <div className="admin-panel">
          <div className="admin-panel__header">
            <h2>Selected user</h2>
            <p>Assign roles, change status, or remove access from this account.</p>
          </div>

          {selectedUser ? (
            <div className="admin-users__detail">
              <div className="admin-users__identity">
                <div className="admin-users__identity-head">
                  <span className="admin-user-card__avatar admin-user-card__avatar--lg">
                    {selectedUser.photoURL ? (
                      <img src={selectedUser.photoURL} alt="" referrerPolicy="no-referrer" />
                    ) : (
                      <UserRound size={18} />
                    )}
                  </span>
                  <div>
                    <h3>{selectedUser.displayName || selectedUser.email}</h3>
                    <p>{selectedUser.email}</p>
                  </div>
                </div>
                <div className="admin-chip-row">
                  <span className={`admin-status-pill is-${selectedUser.role}`}>{selectedUser.role}</span>
                  <span className={`admin-status-pill is-${selectedUser.status}`}>{selectedUser.status}</span>
                  <span className="admin-status-pill">{selectedUser.isPublic ? "Public profile" : "Private profile"}</span>
                </div>
              </div>

              <div className="admin-users__detail-grid">
                <div className="admin-users__detail-item">
                  <strong>Username</strong>
                  <span>{selectedUser.username ? `@${selectedUser.username}` : "Not set"}</span>
                </div>
                <div className="admin-users__detail-item">
                  <strong>Phone</strong>
                  <span>{selectedUser.phoneNumber ?? "Not set"}</span>
                </div>
                <div className="admin-users__detail-item">
                  <strong>Created</strong>
                  <span>{formatTimestamp(selectedUser.createdAt)}</span>
                </div>
                <div className="admin-users__detail-item">
                  <strong>Updated</strong>
                  <span>{formatTimestamp(selectedUser.updatedAt)}</span>
                </div>
              </div>

              <div className="admin-users__control-grid">
                <Select
                  label="Role"
                  value={draftRole}
                  onChange={(event) => setDraftRole(event.target.value as UserRole)}
                  options={ROLE_OPTIONS}
                  disabled={isCurrentAdmin}
                  hint={isCurrentAdmin ? "Your own admin role is locked here to avoid self-demotion." : "Grant admin only to accounts you trust with full dashboard access."}
                />
                <Select
                  label="Status"
                  value={draftStatus}
                  onChange={(event) => setDraftStatus(event.target.value as UserStatus)}
                  options={STATUS_OPTIONS}
                  disabled={isCurrentAdmin}
                  hint={isCurrentAdmin ? "Your own status is locked here to avoid self-lockout." : "Suspended or banned users lose protected-route access in the app."}
                />
              </div>

              <div className="admin-note-box">
                Full Firebase Authentication account deletion is not safe from this frontend-only shell. The removal action below is production-minded: it bans the user, demotes them to member, and hides their portfolio from public community views without pretending the Auth account was truly deleted.
              </div>

              <div className="admin-users__actions">
                <Button onClick={() => void handleSave()} loading={saving} disabled={isCurrentAdmin}>
                  Save access changes
                </Button>
                <Button
                  variant="danger"
                  onClick={() => void handleRemoveAccess()}
                  loading={removing}
                  disabled={isCurrentAdmin}
                >
                  Remove access
                </Button>
                {isCurrentAdmin ? (
                  <span className="admin-users__lock-note">
                    Your own role and status controls are intentionally locked in this screen.
                  </span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="admin-empty-state">Select a user to view and manage account access.</div>
          )}
        </div>
      </section>

      {statusMessage ? (
        <section className="admin-panel">
          <div className={`admin-inline-status ${statusType === "error" ? "is-error" : statusType === "success" ? "is-success" : ""}`}>
            {statusMessage}
          </div>
        </section>
      ) : null}
    </div>
  );
}

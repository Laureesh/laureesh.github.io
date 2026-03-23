import { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import { Code2, ExternalLink, FolderKanban, Link2, Pencil, Plus } from "lucide-react";
import { auth } from "../../firebase/config";
import { useAuth } from "../../contexts/AuthContext";
import {
  createPortfolioProject,
  deletePortfolioProject,
  listPortfolioProjects,
  syncPortfolioRecord,
  updatePortfolioProject,
  type PortfolioProjectInput,
} from "../../services/portfolios";
import {
  getProfilePhotoErrorMessage,
  normalizeProfilePhotoUrl,
  verifyProfilePhotoUrl,
} from "../../services/profilePhotos";
import { updateUserProfile } from "../../services/userProfiles";
import { Button, Checkbox, Input, Modal, Textarea } from "../../components/ui";
import type { ProjectRecord, UserProfile } from "../../types/models";
import AccountPageLayout from "./AccountPageLayout";

interface ProfileFormState {
  displayName: string;
  headline: string;
  bio: string;
  username: string;
  location: string;
  isPublic: boolean;
  skills: string[];
  github: string;
  linkedin: string;
  website: string;
  twitter: string;
  youtube: string;
}

interface ProjectFormState {
  title: string;
  description: string;
  techStackInput: string;
  repoUrl: string;
  liveUrl: string;
  imageUrlsInput: string;
}

const EMPTY_PROJECT_FORM: ProjectFormState = {
  title: "",
  description: "",
  techStackInput: "",
  repoUrl: "",
  liveUrl: "",
  imageUrlsInput: "",
};

const SOCIAL_PREFIXES = {
  github: "https://github.com/",
  linkedin: "https://www.linkedin.com/in/",
  twitter: "https://www.x.com/",
  website: "https://",
  youtube: "https://www.youtube.com/@",
} as const;

type SocialPrefixKey = keyof typeof SOCIAL_PREFIXES;

function stripOuterSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

function normalizeHandle(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  return stripOuterSlashes(trimmed.replace(/^@+/, "").replace(/\s+/g, ""));
}

function extractPrefixedValue(value: string | null | undefined, key: SocialPrefixKey) {
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return "";
  }

  if (key === "website") {
    return trimmed.replace(/^https?:\/\//i, "");
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    const path = stripOuterSlashes(url.pathname);

    if (key === "github" && host.includes("github.com")) {
      return normalizeHandle(path);
    }

    if (key === "linkedin" && host.includes("linkedin.com")) {
      return normalizeHandle(path.replace(/^in\//i, ""));
    }

    if (key === "twitter" && (host.includes("x.com") || host.includes("twitter.com"))) {
      return normalizeHandle(path);
    }

    if (key === "youtube" && host.includes("youtube.com")) {
      return normalizeHandle(path.replace(/^@/, ""));
    }
  } catch {
    // fall through to raw normalization below
  }

  const sanitized = trimmed.replace(/^https?:\/\//i, "");

  if (key === "github") {
    return normalizeHandle(sanitized.replace(/^github\.com\//i, ""));
  }

  if (key === "linkedin") {
    return normalizeHandle(sanitized.replace(/^www\.linkedin\.com\/in\//i, "").replace(/^linkedin\.com\/in\//i, ""));
  }

  if (key === "twitter") {
    return normalizeHandle(
      sanitized
        .replace(/^www\.x\.com\//i, "")
        .replace(/^x\.com\//i, "")
        .replace(/^www\.twitter\.com\//i, "")
        .replace(/^twitter\.com\//i, ""),
    );
  }

  if (key === "youtube") {
    return normalizeHandle(
      sanitized
        .replace(/^www\.youtube\.com\/@/i, "")
        .replace(/^youtube\.com\/@/i, "")
        .replace(/^www\.youtube\.com\//i, "")
        .replace(/^youtube\.com\//i, ""),
    );
  }

  return sanitized;
}

function buildPrefixedUrl(key: SocialPrefixKey, rawValue: string) {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return null;
  }

  if (key === "website") {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `${SOCIAL_PREFIXES.website}${trimmed}`;
    return normalizeOptionalHttpsUrl(withProtocol, "Website");
  }

  const handle = normalizeHandle(extractPrefixedValue(trimmed, key));

  if (!handle) {
    return null;
  }

  if (/[/?#]/.test(handle) && key !== "linkedin") {
    throw new Error(`Enter only the ${key === "twitter" ? "X" : key} handle, not a full path.`);
  }

  if (key === "linkedin" && handle.includes("?")) {
    throw new Error("Enter only the LinkedIn profile handle.");
  }

  return `${SOCIAL_PREFIXES[key]}${handle}`;
}

function getInitialForm(userProfile: UserProfile): ProfileFormState {
  return {
    displayName: userProfile.displayName,
    headline: userProfile.headline,
    bio: userProfile.bio,
    username: normalizeHandle(userProfile.username ?? ""),
    location: userProfile.location ?? "",
    isPublic: userProfile.isPublic,
    skills: userProfile.skills,
    github: extractPrefixedValue(userProfile.socialLinks.github, "github"),
    linkedin: extractPrefixedValue(userProfile.socialLinks.linkedin, "linkedin"),
    website: extractPrefixedValue(userProfile.socialLinks.website, "website"),
    twitter: extractPrefixedValue(userProfile.socialLinks.twitter, "twitter"),
    youtube: extractPrefixedValue(userProfile.socialLinks.youtube, "youtube"),
  };
}

function normalizeList(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();

    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

function parseDelimitedInput(value: string) {
  return normalizeList(value.split(/[\n,]/g));
}

function normalizeOptionalHttpsUrl(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    throw new Error(`Enter a valid ${label} URL.`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS.`);
  }

  return url.toString();
}

function getProjectImageUrls(project: ProjectRecord) {
  return normalizeList(project.assets.map((asset) => asset.url ?? asset.path));
}

function getProjectForm(project?: ProjectRecord | null): ProjectFormState {
  if (!project) {
    return EMPTY_PROJECT_FORM;
  }

  return {
    title: project.title,
    description: project.description,
    techStackInput: project.techStack.join(", "),
    repoUrl: project.repoUrl ?? "",
    liveUrl: project.liveUrl ?? "",
    imageUrlsInput: getProjectImageUrls(project).join("\n"),
  };
}

function buildProfileForSync(userProfile: UserProfile, form: ProfileFormState): UserProfile {
  return {
    ...userProfile,
    displayName: form.displayName.trim() || userProfile.displayName,
    headline: form.headline.trim(),
    bio: form.bio.trim(),
    username: normalizeHandle(form.username) || null,
    location: form.location.trim() || null,
    isPublic: form.isPublic,
    skills: normalizeList(form.skills),
    socialLinks: {
      ...userProfile.socialLinks,
      github: buildPrefixedUrl("github", form.github),
      linkedin: buildPrefixedUrl("linkedin", form.linkedin),
      website: buildPrefixedUrl("website", form.website),
      twitter: buildPrefixedUrl("twitter", form.twitter),
      youtube: buildPrefixedUrl("youtube", form.youtube),
    },
  };
}

export default function ProfilePage() {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(() =>
    userProfile
      ? getInitialForm(userProfile)
      : {
          displayName: "",
          headline: "",
          bio: "",
          username: "",
          location: "",
          isPublic: true,
          skills: [],
          github: "",
          linkedin: "",
          website: "",
          twitter: "",
          youtube: "",
        },
  );
  const [skillInput, setSkillInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<"success" | "error" | null>(null);
  const [photoEditorOpen, setPhotoEditorOpen] = useState(false);
  const [photoLink, setPhotoLink] = useState("");
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<string | null>(null);
  const [photoStatusType, setPhotoStatusType] = useState<"success" | "error" | null>(null);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsStatus, setProjectsStatus] = useState<string | null>(null);
  const [projectsStatusType, setProjectsStatusType] = useState<"success" | "error" | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectSaving, setProjectSaving] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [projectForm, setProjectForm] = useState<ProjectFormState>(EMPTY_PROJECT_FORM);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setForm(getInitialForm(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (!userProfile) {
      return;
    }

    setPhotoLink(userProfile.photoURL ?? "");
    setPhotoStatus(null);
    setPhotoStatusType(null);
  }, [userProfile, photoEditorOpen]);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setProjectsLoading(false);
      return;
    }

    const loadProjects = async () => {
      setProjectsLoading(true);
      setProjectsStatus(null);

      try {
        const records = await listPortfolioProjects(user.uid);
        setProjects(records);
      } catch {
        setProjectsStatus("Unable to load your portfolio projects right now.");
        setProjectsStatusType("error");
      } finally {
        setProjectsLoading(false);
      }
    };

    void loadProjects();
  }, [user]);

  const profileCompletion = useMemo(() => {
    if (!userProfile) {
      return 0;
    }

    const checks = [
      form.displayName.trim(),
      form.headline.trim(),
      form.bio.trim(),
      form.username.trim(),
      form.location.trim(),
      form.skills.length > 0,
      projects.length > 0,
      form.github.trim() || form.linkedin.trim() || form.website.trim(),
    ];

    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [
    form.bio,
    form.displayName,
    form.github,
    form.headline,
    form.linkedin,
    form.location,
    form.skills.length,
    form.username,
    form.website,
    projects.length,
    userProfile,
  ]);

  const canSavePhoto = Boolean(photoLink.trim());

  if (!user || !userProfile) {
    return null;
  }

  const handleAddSkills = () => {
    const nextSkills = normalizeList([...form.skills, ...parseDelimitedInput(skillInput)]);
    setForm((current) => ({ ...current, skills: nextSkills }));
    setSkillInput("");
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setForm((current) => ({
      ...current,
      skills: current.skills.filter((skill) => skill !== skillToRemove),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setStatus(null);
    setStatusType(null);

    try {
      const nextProfile = buildProfileForSync(userProfile, form);

      await updateUserProfile(user.uid, {
        displayName: nextProfile.displayName,
        headline: nextProfile.headline,
        bio: nextProfile.bio,
        username: nextProfile.username,
        location: nextProfile.location,
        isPublic: nextProfile.isPublic,
        skills: nextProfile.skills,
        socialLinks: nextProfile.socialLinks,
      });

      if (auth.currentUser && nextProfile.displayName && auth.currentUser.displayName !== nextProfile.displayName) {
        await updateProfile(auth.currentUser, { displayName: nextProfile.displayName });
      }

      await syncPortfolioRecord(nextProfile, projects.map((project) => project.id).filter(Boolean) as string[]);
      await refreshUserProfile();
      setStatus("Profile saved.");
      setStatusType("success");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save your profile right now.");
      setStatusType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleSavePhoto = async () => {
    setPhotoSaving(true);
    setPhotoStatus(null);
    setPhotoStatusType(null);

    try {
      const normalizedUrl = normalizeProfilePhotoUrl(photoLink);
      await verifyProfilePhotoUrl(normalizedUrl);

      await updateUserProfile(user.uid, {
        photoURL: normalizedUrl,
        avatarStoragePath: null,
      });

      const currentAuthUser = auth.currentUser;

      if (currentAuthUser && currentAuthUser.photoURL !== normalizedUrl) {
        await updateProfile(currentAuthUser, { photoURL: normalizedUrl });
      }

      await refreshUserProfile();
      setPhotoStatus("Profile photo updated.");
      setPhotoStatusType("success");
      setPhotoEditorOpen(false);
    } catch (error) {
      setPhotoStatus(getProfilePhotoErrorMessage(error));
      setPhotoStatusType("error");
    } finally {
      setPhotoSaving(false);
    }
  };

  const openNewProjectModal = () => {
    setEditingProjectId(null);
    setProjectForm(EMPTY_PROJECT_FORM);
    setProjectsStatus(null);
    setProjectsStatusType(null);
    setProjectModalOpen(true);
  };

  const openEditProjectModal = (project: ProjectRecord) => {
    setEditingProjectId(project.id ?? null);
    setProjectForm(getProjectForm(project));
    setProjectsStatus(null);
    setProjectsStatusType(null);
    setProjectModalOpen(true);
  };

  const closeProjectModal = () => {
    setProjectModalOpen(false);
    setEditingProjectId(null);
    setProjectForm(EMPTY_PROJECT_FORM);
  };

  const handleSaveProject = async () => {
    setProjectSaving(true);
    setProjectsStatus(null);
    setProjectsStatusType(null);

    try {
      const title = projectForm.title.trim();
      const description = projectForm.description.trim();

      if (!title) {
        throw new Error("Project title is required.");
      }

      if (!description) {
        throw new Error("Project description is required.");
      }

      const input: PortfolioProjectInput = {
        title,
        description,
        techStack: parseDelimitedInput(projectForm.techStackInput),
        repoUrl: normalizeOptionalHttpsUrl(projectForm.repoUrl, "GitHub repository"),
        liveUrl: normalizeOptionalHttpsUrl(projectForm.liveUrl, "Live demo"),
        imageUrls: parseDelimitedInput(projectForm.imageUrlsInput).map((url) => normalizeProfilePhotoUrl(url)),
      };

      if (editingProjectId) {
        const existing = projects.find((project) => project.id === editingProjectId);

        if (!existing) {
          throw new Error("That project could not be found.");
        }

        await updatePortfolioProject(
          editingProjectId,
          user.uid,
          input,
          form.isPublic ? "public" : "private",
          existing,
        );
      } else {
        await createPortfolioProject(user.uid, input, form.isPublic ? "public" : "private");
      }

      const nextProjects = await listPortfolioProjects(user.uid);
      setProjects(nextProjects);
      await syncPortfolioRecord(
        buildProfileForSync(userProfile, form),
        nextProjects.map((project) => project.id).filter(Boolean) as string[],
      );
      setProjectsStatus(editingProjectId ? "Project updated." : "Project added.");
      setProjectsStatusType("success");
      closeProjectModal();
    } catch (error) {
      setProjectsStatus(error instanceof Error ? error.message : "Unable to save this project right now.");
      setProjectsStatusType("error");
    } finally {
      setProjectSaving(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjectsStatus(null);
    setProjectsStatusType(null);

    try {
      await deletePortfolioProject(projectId);
      const nextProjects = projects.filter((project) => project.id !== projectId);
      setProjects(nextProjects);
      await syncPortfolioRecord(
        buildProfileForSync(userProfile, form),
        nextProjects.map((project) => project.id).filter(Boolean) as string[],
      );
      setProjectsStatus("Project removed.");
      setProjectsStatusType("success");
    } catch {
      setProjectsStatus("Unable to remove that project right now.");
      setProjectsStatusType("error");
    }
  };

  return (
    <AccountPageLayout
      eyebrow="Account"
      title="Profile"
      description="Build out the member profile and portfolio data that future community and portfolio views will use: name, bio, skills, links, visibility, and user-owned projects."
      sidebar={(
        <>
          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Profile snapshot</h3>
            </div>
            <div className="account-profile-card">
              <div className="account-profile-avatar-wrap">
                {userProfile.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt=""
                    className="account-profile-avatar"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="account-profile-avatar account-profile-avatar--initial">
                    {(form.displayName || user.email || "U").charAt(0).toUpperCase()}
                  </span>
                )}
                <button
                  type="button"
                  className="account-profile-avatar-edit"
                  aria-label="Edit profile photo"
                  title="Edit profile photo"
                  onClick={() => setPhotoEditorOpen(true)}
                >
                  <Pencil size={14} />
                </button>
              </div>
              <div className="account-profile-copy">
                <h3>{form.displayName || userProfile.displayName}</h3>
                <p>{user.email}</p>
                <div className="account-badges">
                  <span className="account-badge">{userProfile.role}</span>
                  <span className="account-badge">{form.isPublic ? "Public profile" : "Private profile"}</span>
                </div>
                {photoStatus ? (
                  <span className={`account-status-text ${photoStatusType === "error" ? "is-error" : photoStatusType === "success" ? "is-success" : ""}`}>
                    {photoStatus}
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Portfolio readiness</h3>
              <p>These are the core signals the shared portfolio hub will rely on later.</p>
            </div>
            <div className="account-chip-row">
              <span className="account-chip">{profileCompletion}% complete</span>
              <span className="account-chip">{form.skills.length} skills</span>
              <span className="account-chip">{projects.length} projects</span>
            </div>
            <ul className="account-summary-list">
              <li className="account-summary-row"><strong>Headline</strong><span>{form.headline.trim() ? "Set" : "Missing"}</span></li>
              <li className="account-summary-row"><strong>Bio</strong><span>{form.bio.trim() ? "Set" : "Missing"}</span></li>
              <li className="account-summary-row"><strong>Skills</strong><span>{form.skills.length || "Missing"}</span></li>
              <li className="account-summary-row"><strong>Projects</strong><span>{projects.length || "Missing"}</span></li>
            </ul>
          </div>

          <div className="account-panel">
            <div className="account-panel-header">
              <h3>Photo security</h3>
              <p>Your profile photo uses a validated HTTPS image URL only. Local/private-network URLs and SVG files are blocked.</p>
            </div>
            <ul className="account-checklist">
              <li><strong>URL only</strong><span>Use a direct HTTPS image link from a host you trust.</span></li>
              <li><strong>Blocked</strong><span>Local/private-network URLs, embedded credentials, and SVG images are rejected.</span></li>
              <li><strong>Privacy</strong><span>Avatar images load with a no-referrer policy where possible.</span></li>
            </ul>
          </div>
        </>
      )}
    >
      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Public profile details</h2>
          </div>
          <p>These fields shape how your member profile appears across the account area and future community pages.</p>
        </div>

        <div className="account-form-grid">
          <Input
            label="Display Name"
            value={form.displayName}
            onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
            placeholder="How your name should appear"
          />
          <Input
            label="Username"
            value={form.username}
            onChange={(event) => setForm((current) => ({ ...current, username: normalizeHandle(event.target.value) }))}
            placeholder="laureesh"
            hint="Optional handle for community and profile links later."
            leadingAddon="@"
          />
          <Input
            label="Headline"
            value={form.headline}
            onChange={(event) => setForm((current) => ({ ...current, headline: event.target.value }))}
            placeholder="Frontend developer building polished, practical apps"
            className="account-field-full"
          />
          <Input
            label="Location"
            value={form.location}
            onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            placeholder="Atlanta, GA"
          />
          <Input
            label="Email"
            value={user.email ?? ""}
            disabled
            hint="Managed by Firebase Authentication."
          />
          <div className="account-field-full">
            <Textarea
              label="Bio"
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              placeholder="Share the short version of your background, what you build, and what you're focused on right now."
              rows={6}
            />
          </div>
        </div>
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Skills tags</h2>
          </div>
          <p>Add the stack keywords you want attached to your member profile and future portfolio discovery.</p>
        </div>

        <div className="account-tag-editor">
          <div className="account-tag-input-row">
            <Input
              label="Skills"
              value={skillInput}
              onChange={(event) => setSkillInput(event.target.value)}
              placeholder="React, TypeScript, Firebase, UI Design"
              hint="Press Add after entering one or more skills. Commas are supported."
              className="account-field-full"
            />
            <Button variant="secondary" onClick={handleAddSkills} disabled={!skillInput.trim()}>
              Add skills
            </Button>
          </div>

          {form.skills.length ? (
            <div className="account-chip-row">
              {form.skills.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  className="account-chip account-chip-button"
                  onClick={() => handleRemoveSkill(skill)}
                  title={`Remove ${skill}`}
                >
                  {skill}
                  <span className="account-chip-dismiss">x</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="account-empty-state">
              No skills added yet. Add the tags you want associated with your profile.
            </div>
          )}
        </div>
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-panel-title-row">
            <h2>Links and visibility</h2>
          </div>
          <p>Keep the important links easy to reach and control whether your profile is discoverable.</p>
        </div>

        <div className="account-form-grid">
          <Input
            label="GitHub"
            value={form.github}
            onChange={(event) => setForm((current) => ({ ...current, github: event.target.value }))}
            placeholder="Laureesh"
            leadingAddon={SOCIAL_PREFIXES.github}
            hint="Enter only your GitHub handle."
          />
          <Input
            label="LinkedIn"
            value={form.linkedin}
            onChange={(event) => setForm((current) => ({ ...current, linkedin: event.target.value }))}
            placeholder="laureesh"
            leadingAddon={SOCIAL_PREFIXES.linkedin}
            hint="Enter only your LinkedIn profile handle."
          />
          <Input
            label="Website"
            value={form.website}
            onChange={(event) => setForm((current) => ({ ...current, website: event.target.value }))}
            placeholder="your-site.com"
            leadingAddon={SOCIAL_PREFIXES.website}
            hint="Enter the domain or full HTTPS URL."
          />
          <Input
            label="Twitter / X"
            value={form.twitter}
            onChange={(event) => setForm((current) => ({ ...current, twitter: event.target.value }))}
            placeholder="laureesh"
            leadingAddon={SOCIAL_PREFIXES.twitter}
            hint="Enter only your X handle."
          />
          <Input
            label="YouTube"
            value={form.youtube}
            onChange={(event) => setForm((current) => ({ ...current, youtube: event.target.value }))}
            placeholder="laureesh"
            leadingAddon={SOCIAL_PREFIXES.youtube}
            hint="Enter only your channel handle without @."
            className="account-field-full"
          />
        </div>

        <div className="account-toggle-grid">
          <Checkbox
            label="Make my profile public"
            description="When enabled, your future community profile can be discoverable to other signed-in users."
            checked={form.isPublic}
            onChange={(event) => setForm((current) => ({ ...current, isPublic: event.target.checked }))}
          />
        </div>

        <div className="account-actions">
          <Button onClick={() => void handleSave()} loading={saving}>Save profile</Button>
          {status ? (
            <span className={`account-status-text ${statusType === "error" ? "is-error" : statusType === "success" ? "is-success" : ""}`}>
              {status}
            </span>
          ) : null}
        </div>
      </div>

      <div className="account-panel">
        <div className="account-panel-header">
          <div className="account-project-header-row">
            <div className="account-panel-title-row">
              <FolderKanban size={18} />
              <h2>Portfolio projects</h2>
            </div>
            <Button variant="secondary" icon={<Plus size={15} />} onClick={openNewProjectModal}>
              Add project
            </Button>
          </div>
          <p>Manage the projects that belong to your personal portfolio record: title, description, tech stack, links, and image URLs.</p>
        </div>

        {projectsLoading ? (
          <div className="account-empty-state">Loading your portfolio projects...</div>
        ) : projects.length ? (
          <div className="account-project-grid">
            {projects.map((project) => {
              const imageCount = getProjectImageUrls(project).length;

              return (
                <article key={project.id} className="account-project-card">
                  <div className="account-project-card-head">
                    <div>
                      <h3>{project.title}</h3>
                      <p>{project.description}</p>
                    </div>
                    <div className="account-actions">
                      <Button size="sm" variant="ghost" onClick={() => openEditProjectModal(project)}>
                        Edit
                      </Button>
                      {project.id ? (
                        <Button size="sm" variant="ghost" onClick={() => void handleDeleteProject(project.id!)}>
                          Remove
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="account-chip-row">
                    {project.techStack.map((item) => (
                      <span key={item} className="account-chip">{item}</span>
                    ))}
                    {imageCount ? <span className="account-chip">{imageCount} image{imageCount === 1 ? "" : "s"}</span> : null}
                  </div>

                  <div className="account-project-links">
                    {project.repoUrl ? (
                      <a href={project.repoUrl} target="_blank" rel="noreferrer" className="account-project-link">
                        <Code2 size={14} />
                        GitHub
                      </a>
                    ) : null}
                    {project.liveUrl ? (
                      <a href={project.liveUrl} target="_blank" rel="noreferrer" className="account-project-link">
                        <ExternalLink size={14} />
                        Live demo
                      </a>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="account-empty-state">
            No portfolio projects yet. Add your first one so your profile has real work attached to it.
          </div>
        )}

        {projectsStatus ? (
          <span className={`account-status-text ${projectsStatusType === "error" ? "is-error" : projectsStatusType === "success" ? "is-success" : ""}`}>
            {projectsStatus}
          </span>
        ) : null}
      </div>

      <Modal
        open={photoEditorOpen}
        onClose={() => setPhotoEditorOpen(false)}
        title="Edit profile photo"
        size="sm"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setPhotoEditorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSavePhoto()} loading={photoSaving} disabled={!canSavePhoto}>
              Save photo
            </Button>
          </>
        )}
      >
        <div className="account-photo-editor">
          <div className="account-photo-link">
            <div className="account-chip-row">
              <span className="account-chip">
                <Link2 size={12} />
                Image URL only
              </span>
            </div>
            <Input
              label="HTTPS image URL"
              value={photoLink}
              onChange={(event) => setPhotoLink(event.target.value)}
              placeholder="https://example.com/profile-photo.jpg"
              hint="HTTPS only. Local/private-network URLs, embedded credentials, and SVG images are blocked."
            />
            <div className="account-note-box">
              Use a direct image link from a host you trust.
            </div>
          </div>

          {photoStatus && photoEditorOpen ? (
            <span className={`account-status-text ${photoStatusType === "error" ? "is-error" : photoStatusType === "success" ? "is-success" : ""}`}>
              {photoStatus}
            </span>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={projectModalOpen}
        onClose={closeProjectModal}
        title={editingProjectId ? "Edit portfolio project" : "Add portfolio project"}
        size="md"
        footer={(
          <>
            <Button variant="ghost" onClick={closeProjectModal}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveProject()} loading={projectSaving}>
              {editingProjectId ? "Save changes" : "Add project"}
            </Button>
          </>
        )}
      >
        <div className="account-form-grid">
          <Input
            label="Title"
            value={projectForm.title}
            onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
            placeholder="Movie Streaming App"
            className="account-field-full"
          />
          <div className="account-field-full">
            <Textarea
              label="Description"
              value={projectForm.description}
              onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What the project does, what makes it notable, and the value it shows."
              rows={5}
            />
          </div>
          <Input
            label="Tech stack"
            value={projectForm.techStackInput}
            onChange={(event) => setProjectForm((current) => ({ ...current, techStackInput: event.target.value }))}
            placeholder="React, Firebase, TypeScript"
            hint="Separate items with commas."
            className="account-field-full"
          />
          <Input
            label="GitHub link"
            value={projectForm.repoUrl}
            onChange={(event) => setProjectForm((current) => ({ ...current, repoUrl: event.target.value }))}
            placeholder="https://github.com/username/project"
          />
          <Input
            label="Live demo"
            value={projectForm.liveUrl}
            onChange={(event) => setProjectForm((current) => ({ ...current, liveUrl: event.target.value }))}
            placeholder="https://project-demo.com"
          />
          <div className="account-field-full">
            <Textarea
              label="Image URLs"
              value={projectForm.imageUrlsInput}
              onChange={(event) => setProjectForm((current) => ({ ...current, imageUrlsInput: event.target.value }))}
              placeholder={"https://example.com/screenshot-1.png\nhttps://example.com/screenshot-2.png"}
              hint="One image URL per line or comma-separated. HTTPS only."
              rows={4}
            />
          </div>
        </div>
      </Modal>
    </AccountPageLayout>
  );
}

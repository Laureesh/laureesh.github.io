# Private project interview preparation

The prepared content is in `notes/interview-prep.local/project-interview-prep.json`: ten questions and suggested answers for each of the nine showcase projects. This directory is ignored by Git's existing `*.local` pattern. Keep a private backup; do not move this file into `src`, `public`, or a public repository.

After deploying the UI changes, sign in with an active admin account and verified email. Open **Projects → Interview practice → Import / replace interview notes** on any project. Select the prepared JSON file once to save all nine projects. Open another project's panel, or use **Reload notes** if it was already open.

Imports replace the entire interview collection. The service writes `pages/project-interview-prep` with `visibility: private` and `status: draft`. The existing Firestore `/pages/{pageId}` rules allow active admins to read it and reject public/member reads. No new rules deployment is required if those repository rules are already deployed. The frontend also checks the admin session before rendering or reading. No private answers are bundled with the static site.

This workspace has not authenticated to the production admin account or imported the content. The one-time authenticated import is still required. Verify guest/member denial against the deployed Firestore rules before relying on production access controls.

The answers distinguish verified local browser implementations from original external projects and proposed improvements. Personal contributions and measured results should be adapted to actual experience.

Validation: `npm run build`; `node --test tests/project-interview-prep.test.mjs`. The tests cover import validation, admin-check failures, private write metadata, and (when the local seed/build exist) all-project coverage and exclusion of private answers from generated JavaScript. They do not replace a deployed Firestore authorization test.

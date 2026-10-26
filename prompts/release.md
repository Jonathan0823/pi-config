---
description: Draft and safely prepare a versioned GitHub release
argument-hint: [scope]
---

Inspect the repo before drafting:

1. `git status -sb`, `git branch -vv`, `git remote -v`, and recent commits.
2. Inspect the latest tag/release and determine the changes since it. Use `gh release list` or `gh release view` when `gh` and a remote are available; inspect merged PRs when useful.
3. Find the project's version source, changelog, release instructions, and existing release-note template (including `.github/release.yml` or release template files). Follow repo conventions over the defaults below.

Do not include unrelated uncommitted work as released changes. Do not guess the previous release, current version, or change details; state what could not be verified and ask one focused question if it blocks a reliable draft.

First draft the proposed version and release notes; do not edit files yet:

- Recommend a version using the project's existing convention and changes since the last release. Explain the recommendation briefly; do not assume SemVer if the project uses another scheme.
- Match the repo's title/tag format. If none exists, use `<project> <version>` for the title and `v<version>` for the tag, with only one `v` prefix.
- Write concise, user-facing notes. Prefer merged PRs and verified changes over raw commit messages. Link PRs when available; omit empty sections.

Use this default body only when the repo has no release-note template:

```markdown
## Highlights

- <most important user-facing change>

## Added

- <new capabilities>

## Changed

- <behavior or other notable changes>

## Fixed

- <user-visible fixes>

## Breaking / Upgrade Notes

- <breaking changes or upgrade steps>

## Full Changelog

[<previous-tag>...<new-tag>](https://github.com/<owner>/<repo>/compare/<previous-tag>...<new-tag>)
```

Include only sections with content. Do not invent contributors, breaking changes, upgrade steps, or a compare link. Omit `Full Changelog` when the previous tag or GitHub remote cannot be verified; omit any other section without verified content.

Approval and release flow:

1. Present the proposed version, rationale, release title/body, and any uncertainty. Ask the user to approve or revise this draft. Do not modify files before approval.
2. After approval, update the existing version/changelog files according to repo conventions, run the relevant checks, and show the exact diff and results. Do not create a new changelog or release configuration unless the repo already expects one.
3. Then present the exact commit/tag/push/GitHub Release actions needed. Get a separate explicit approval before staging or committing, pushing, creating a tag, or publishing with `gh release create`. Execute only the approved actions; never publish as part of the initial draft approval.

Do not stage, commit, push, tag, or publish without explicit approval.

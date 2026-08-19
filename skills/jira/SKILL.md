---
name: jira
description: Query, create, and update Jira issues via the REST API. Use when the user mentions Jira tickets, issues, or story keys (e.g. ABC-123).
---

# Jira

Credentials and defaults come from environment variables; never hardcode or echo secrets:

- `JIRA_URL` — e.g. `https://yourcompany.atlassian.net`
- `JIRA_EMAIL` — account email for basic auth
- `JIRA_API_TOKEN` — API token from https://id.atlassian.com/manage-profile/security/api-tokens
- `JIRA_PROJECT_KEY` — optional default project key

The Jira CLI loads `.env` from the current project directory. Existing environment variables take precedence. If a required variable is unset, tell the user what to set instead of guessing. Never hardcode a project key.

## Jira CLI

Use the dependency-free CLI instead of constructing curl commands. Resolve it from the Pi configuration directory:

```sh
JIRA_CLI="${PI_CONFIG_DIR:-$HOME/.pi/agent}/skills/jira/scripts/jira.mjs"
node "$JIRA_CLI" --help
```

Read commands:

```sh
node "$JIRA_CLI" auth-check
node "$JIRA_CLI" issue ABC-123
node "$JIRA_CLI" search --jql 'project = ABC ORDER BY created DESC'
node "$JIRA_CLI" create-meta --project ABC
node "$JIRA_CLI" issue-types --project ABC
node "$JIRA_CLI" assignees --project ABC --query 'Jane'
node "$JIRA_CLI" assignees --issue ABC-123 --query 'Jane'
node "$JIRA_CLI" comments ABC-123
node "$JIRA_CLI" transitions ABC-123 --fields
node "$JIRA_CLI" link-types
```

Mutation commands (run only after the user explicitly requests or confirms the change):

```sh
node "$JIRA_CLI" create --summary 'Summary' --type Task --description-file /tmp/description.md
node "$JIRA_CLI" create --summary 'Child' --type Sub-task --parent ABC-123
node "$JIRA_CLI" edit ABC-123 --summary 'Updated summary'
node "$JIRA_CLI" assign ABC-123 --account-id ACCOUNT_ID
node "$JIRA_CLI" comment ABC-123 --file /tmp/comment.md
node "$JIRA_CLI" transition ABC-123 --id TRANSITION_ID
node "$JIRA_CLI" link --type Blocks --inward ABC-123 --outward ABC-456
```

Use `--fields-file` with create, edit, or transition when project-specific fields are required. Inspect `create-meta` first. Descriptions and comments accept plain text and are converted to Atlassian Document Format by the CLI.

## Ticket breakdown workflow

When a request spans multiple independently deliverable outcomes:

1. Inspect the relevant repository and project instructions before writing scope.
2. Read the parent issue first if splitting an existing issue.
3. Create 3-7 focused child Tasks or Sub-tasks, depending on project configuration.
4. Give every child a single outcome, explicit acceptance criteria, test scope, and dependencies.
5. Resolve the assignee by account ID using the assignable-user endpoint; never guess from a display name.
6. Assign only when the user explicitly requests it.
7. Link or parent the child issues and add a comment to the parent summarizing the breakdown.

Prefer standard library or existing project dependencies in implementation guidance. Do not add a generic framework unless the ticket explicitly requires it.

## Rules

- Never print the token. If it leaks into a command or log, tell the user to revoke it at the API token page.
- Use `jq` or equivalent processing to slice responses to only the requested fields.
- Perform read-only lookups before mutations.
- Ask before changing an issue unless the user explicitly requested the change.
- If the project key, issue type, parent relationship, or assignee is ambiguous, ask instead of guessing.

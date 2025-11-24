## Execution Policy

**CRITICAL**: Claude Code is NEVER allowed to execute ANY commands that modify infrastructure, deployments, or configuration without EXPLICIT user permission first. This includes but is not limited to:

- ANY Azure CLI commands (az *)
- ANY kubectl commands that modify state (apply, delete, restart, rollout, patch, scale, etc.)
- ANY Terraform commands
- ANY deployment CLI commands
- ANY commands that create, update, or delete resources

**ONLY READ-ONLY commands are allowed without asking:**
- kubectl get, kubectl describe, kubectl logs
- az show, az list (with --query for read-only data)
- File reads, greps, globs
- Git status, git log, git diff (read-only operations)

**Before executing ANY command that could modify state, Claude MUST:**
1. Identify the issue/problem
2. Explain what needs to be changed
3. Show the exact command(s) that would fix it
4. WAIT for explicit user approval
5. NEVER proceed without confirmation

**If Claude executes a state-changing command without permission, the user will immediately terminate the session.**
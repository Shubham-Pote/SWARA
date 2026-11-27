# Security policy

Report a suspected vulnerability through [GitHub private vulnerability reporting](https://github.com/Shubham-Pote/SWARA/security/advisories/new) if available. If it is unavailable, contact the maintainer privately. Use public issues for ordinary bugs.

Include the affected revision, the component involved, a minimal description of the impact, and relevant logs with credentials, account identifiers, and personal data removed. Avoid including real learner records.

Keep MongoDB credentials, JWT signing secrets, Gemini keys, and ElevenLabs keys in the backend environment. Any value prefixed with `BUN_PUBLIC_` can be exposed to the browser. If a secret was pushed to Git, revoke or rotate it promptly. Removing it from the current branch leaves the old value in history.

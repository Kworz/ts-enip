---
"enip-ts": major
---

require Node 24, and fix the bugs that surfaced getting there

**Breaking:** `engines.node` is now `>=24`. Node 20 and 22 are no longer
supported — not because anything in the code requires 24, but because nothing
verifies the older runtimes: the only consumer runs 24 and CI builds on 24.
The previous `^20.x` claim was already false, since it excluded the very runtime
the package was being used on.

Fixes made along the way:

- import `EventEmitter` from `events` instead of `stream`, which no longer
  re-exports it
- fix `if (this.state.session.state = "established")` — an assignment used as a
  condition, so the branch was always taken and the session state was
  overwritten. Callers accidentally relying on that always-true path will now
  see `write` refuse when the session is not actually established.
- give the TCP connect an explicit 10s timeout, and stop rejecting an
  already-resolved write promise from a dangling `setTimeout`
- listen for the socket's `error`/`listening` events instead of wrapping the
  asynchronous `server.listen` in a `try/catch` that could never catch anything,
  which left the promise pending forever when the port was unavailable
- accept the `Error | null` argument that `@types/node` declares on
  `socket.write` callbacks
- fix the `./Encapsulation/Header` export, which pointed at `dist/enup/...` and
  therefore resolved to nothing
- bump `@types/node` to `^24` so the types match the supported runtime

---
"enip-ts": patch
---

fix: run correctly on Node 24

- import `EventEmitter` from `events` instead of `stream`, which no longer
  re-exports it
- fix `if (this.state.session.state = "established")` — an assignment used as a
  condition, so the branch was always taken and the session state was overwritten
- give the TCP connect an explicit 10s timeout, and stop rejecting an
  already-resolved write promise from a dangling `setTimeout`
- listen for the socket's `error`/`listening` events instead of wrapping the
  asynchronous `server.listen` in a `try/catch` that could never catch anything
- fix the `./Encapsulation/Header` export, which pointed at `dist/enup/...` and
  therefore resolved to nothing
- widen `engines.node` to `>=20`

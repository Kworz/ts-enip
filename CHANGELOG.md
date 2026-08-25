# enip-ts

## 3.0.0

### Major Changes

- [#13](https://github.com/Kworz/ts-enip/pull/13) [`6ea9be7`](https://github.com/Kworz/ts-enip/commit/6ea9be7aae4f567778e0e8605a5c6c3a12b4661a) Thanks [@Kworz](https://github.com/Kworz)! - require Node 24, and fix the bugs that surfaced getting there

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

## 2.0.0

### Major Changes

- [#9](https://github.com/Kworz/ts-enip/pull/9) [`7ca11f8`](https://github.com/Kworz/ts-enip/commit/7ca11f84370b0b4d1f491205aa319cfa0d1a174c) Thanks [@Kworz](https://github.com/Kworz)! - chore: refactored code to not use namespaces

- [#9](https://github.com/Kworz/ts-enip/pull/9) [`7526c4f`](https://github.com/Kworz/ts-enip/commit/7526c4f6ff9b2a1615016a0edc3dfd9cdd3ac7ad) Thanks [@Kworz](https://github.com/Kworz)! - chore: updated all dependencies

## 1.2.2

### Patch Changes

- [#7](https://github.com/Kworz/ts-enip/pull/7) [`085f34a`](https://github.com/Kworz/ts-enip/commit/085f34a0fbd2169fc2d98e1ce555ae27f44ffdc5) Thanks [@Kworz](https://github.com/Kworz)! - feat: added timeout

## 1.2.1

### Patch Changes

- [#5](https://github.com/Kworz/ts-enip/pull/5) [`3bb9499`](https://github.com/Kworz/ts-enip/commit/3bb94996cb020a6e874849fcb29c42f0f212f6b0) Thanks [@Kworz](https://github.com/Kworz)! - feat: better connect handling

## 1.2.0

### Minor Changes

- c730077: feat: removed ENIPServer namespace

### Patch Changes

- 6c4d142: feat: Vector function can return undefined to send an Error packet
- 8e5d145: feat: now using changesets

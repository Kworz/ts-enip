# ts-enip – TypeScript EtherNet/IP™

TypeScript implementation of the Ethernet/IP™ protocol.

Based on the work of [cmseaton42/node-ethernet-ip](https://github.com/cmseaton42/node-ethernet-ip) and [SerafinTech/ST-node-ethernet-ip](https://github.com/SerafinTech/ST-node-ethernet-ip)

This implementation is less complete but more stable and readable.
We use this implementation as a part of a private project.

## Building

Run PNPM to build this package.

```bash
pnpm run build
```

## Installing

This packet is not published to npm library for now.
As Github Npm packages still want you to have a Github PAT, you will need to generate a Github PAT in order to workaround this limitation.

Add the following lines to `.npmrc` & replace `$GITHUB_TOKEN` with your Github PAT.

```ini
@metalizzsas:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=$GITHUB_TOKEN
```

Then you can add ts-enip with

```bash
pnpm install @metalizzsas/ts-enip
```

## Using the library

Using this packet is more complex but more versatile as you can write raw packets to the socket.

```typescript
import { ENIP } from "ts-enip";

const enip = new ENIP.SocketController();

const sessionID = await enip.connect("12.0.0.1");

if(sessionID)
{
    /**
     * Define your ethernet ip packet here
     * You can used bundled tools like Encapsulation.CPF
     */ 
    const packet: Buffer = Buffer.alloc(0);
    enip.write(packet);
}
```

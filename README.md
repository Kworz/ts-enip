# ts-enip – TypeScript EtherNet/IP™

TypeScript implementation of the Ethernet/IP™ protocol.

Based on the work of [cmseaton42/node-ethernet-ip](https://github.com/cmseaton42/node-ethernet-ip) and [SerafinTech/ST-node-ethernet-ip](https://github.com/SerafinTech/ST-node-ethernet-ip)

This implementation is less complete.

## Building

Run PNPM to build this package.

```bash
pnpm run build
```

## Installing

Install this package with

```bash
npm install enip-ts
```

## Using the library

Using this packet is more complex but more versatile as you can write raw packets to the socket.

```typescript
import { ENIP } from "ts-enip";

const enip = new ENIP.SocketController();

const sessionID = await enip.connect("127.0.0.1");

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

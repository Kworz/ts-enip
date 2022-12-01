# ts-enip – TypeScript EtherNet/IP™

[![🚀 Build package and publish to npm](https://github.com/Kworz/ts-enip/actions/workflows/workflow.yaml/badge.svg)](https://github.com/Kworz/ts-enip/actions/workflows/workflow.yaml)
[![npm version](https://badge.fury.io/js/enip-ts.svg)](https://badge.fury.io/js/enip-ts)

TypeScript implementation of the Ethernet/IP™ protocol. This implementation is less complete.

Based on the work of [cmseaton42/node-ethernet-ip](https://github.com/cmseaton42/node-ethernet-ip) and [SerafinTech/ST-node-ethernet-ip](https://github.com/SerafinTech/ST-node-ethernet-ip).

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

### Client Side

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

    //Path for ethernet ip protocol
    const idPath = Buffer.from([0x20, 0x04, 0x24, 0x96, 0x30, 0x03]);
    
    //Message router packet
    const MR = MessageRouter.build(0x0E, idPath, Buffer.alloc(0));

    enip.write(MR, false, 10);
}
```

### Server side

For server side, only services 0x0E & 0x10 are supported.

```typescript

    const actualData = Buffer.alloc(4);
    actualData.writeUInt32BE(0xF0F0F0F0);
    
    const vector: ENIPDataVector = {
        0x0E: (data) => {
            if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3)
                return actualData.readUInt32LE();
            else
                return 0;
        },
        0x10: (data) => {
            if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3 && data.data)
            {
                actualData.writeUint32LE(data.data.readUint32LE());
                console.log(actualData);
                return actualData.readUInt32LE();
            }
            else
                return 0;
        }
    }
    
    const server = new ENIPServer.SocketController(vector);
    
    server.listen("0.0.0.0");

```

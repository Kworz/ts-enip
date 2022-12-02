# ts-enip – TypeScript EtherNet/IP™

![🚀 Build package and publish to npm](https://github.com/Kworz/ts-enip/actions/workflows/workflow.yaml/badge.svg)
![npm](https://img.shields.io/npm/v/enip-ts)

TypeScript implementation of the Ethernet/IP™ protocol. This implementation is less complete.

Based on the work of [cmseaton42/node-ethernet-ip](https://github.com/cmseaton42/node-ethernet-ip) and [SerafinTech/ST-node-ethernet-ip](https://github.com/SerafinTech/ST-node-ethernet-ip).

## Contributions

Contributions will be highly appreciated 👍. This package use changesets for its versioning. Create a Changeset using

```bash
npx changeset
pnpm exec changeset
```

Sepcify what have changed, commit to your branch and create a pull request on this repo 📝. Changeset bot will detect changesets.

## Building

Run PNPM to build this package.

```bash
npm run build
pnpm run build
```

## Installing

Install this package with

```bash
npm install enip-ts
pnpm install enip-ts
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

    const actualData = Buffer.alloc(4, 0xF0);
    
    const vector: ENIPDataVector = {
        0x0E: (data) => {
            if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3)
                return actualData;
            else
                return;
        },
        0x10: (data) => {
            if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3 && data.data)
            {
                data.data.copy(actualData);
                return actualData;
            }
            else
                return;
        }
    }
    
    const server = new ENIPServer(vector);
    
    // Server will listen on Default enip port 44818
    server.listen();

```

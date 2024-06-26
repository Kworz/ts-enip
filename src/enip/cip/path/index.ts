type Path = { class: number, instance: number, attribute: number };

export type CIPPacket = {
    path: Path
    service: number;
    data?: Buffer;
}

export class CIP
{
    /**
     * Parse a CIP Packet
     * @param buf buffer received
     * @returns decoded CIP Packet
     */
    static parse(buf: Buffer): CIPPacket {

        const path: Path = { class: 0, instance: 0, attribute: 0 };

        const service = buf[0];
        const requestPathSize = buf[1];

        for(let i = 0; i < requestPathSize * 2; i = i + 2)
        {
            switch(buf[2 + i])
            {
                case 0x20: { path.class = buf[3 + i]; break;}
                case 0x24: { path.instance = buf[3 + i]; break;}
                case 0x30: { path.attribute = buf[3 + i]; break;}
            }
        }

        const data = buf.slice(2 + requestPathSize * 2, buf.length);

        const dataBuffer = data.length > 0 ? data : undefined;

        return { service: service, path, data: dataBuffer };
    }
}
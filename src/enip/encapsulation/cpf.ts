export type dataItem = {
    TypeID: number,
    length?: number
    data: Buffer,
}

export const ItemIDs: Record<string, number> = {
    Null: 0x00,
    ListIdentity: 0x0c,
    ConnectionBased: 0xa1,
    ConnectedTransportPacket: 0xb1,
    UCMM: 0xb2,
    ListServices: 0x100,
    SockaddrO2T: 0x8000,
    SockaddrT2O: 0x8001,
    SequencedAddrItem: 0x8002
}

/**
 * Checks if the specified command number is a known command
 * @param cmd Command number to check
 * @returns if the command is a known command
 */
export function isCmd(cmd: number): boolean {       
    return Object.values(ItemIDs).includes(cmd);
}

/**
 * Builds a Common Packet Formatted Buffer to be
 * Encapsulated.
 *
 * @param dataItems - Array of CPF Data Items
 * @returns CPF Buffer to be Encapsulated
 */
export function build(dataItems: Array<dataItem>): Buffer 
{
    // Write Item Count and Initialize Buffer
    let buf = Buffer.alloc(2);
    buf.writeUInt16LE(dataItems.length, 0);

    for (let item of dataItems)
    {
        const { TypeID, data } = item;

        if (!isCmd(TypeID)) throw new Error("Invalid CPF Type ID!");

        let buf1 = Buffer.alloc(4);
        let buf2 = Buffer.from(data);

        buf1.writeUInt16LE(TypeID, 0);
        buf1.writeUInt16LE(buf2.length, 2);

        buf = buf2.length > 0 ? Buffer.concat([buf, buf1, buf2]) : Buffer.concat([buf, buf1]);
    }

    return buf;
}

/**
 * Parses Incoming Common Packet Formatted Buffer
 * and returns an Array of Objects.
 *
 * @param buf - Common Packet Formatted Data Buffer
 * @returns Array of Common Packet Data Objects
 */
export function parse(buf: Buffer): dataItem[] {
    const itemCount = buf.readUInt16LE(0);

    let ptr = 2;
    let arr = [];

    for (let i = 0; i < itemCount; i++) {
        // Get Type ID
        const TypeID = buf.readUInt16LE(ptr);
        ptr += 2;

        // Get Data Length
        const length = buf.readUInt16LE(ptr);
        ptr += 2;

        // Get Data from Data Buffer
        const data = Buffer.alloc(length);
        buf.copy(data, 0, ptr, ptr + length);

        // Append Gathered Data Object to Return Array
        arr.push({ TypeID, length, data });

        ptr += length;
    }

    return arr;
}
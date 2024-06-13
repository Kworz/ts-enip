import { Commands, parseStatus, validateCommand } from ".";

export interface ParsedHeader
{
    /** Encapsulation command code */
    commandCode: number, 
    /** Encapsulation command string interpretation */
    command: string,
    /** Length of encapsulated data */
    length: number,
    /** Session ID */
    session: number,
    /** Status code */
    statusCode: number,
    /** Status code sitrng interpretation */
    status: string,
    /** Options (Typically 0x00) */
    options: number,
    /** Encapsulated Data buffer */
    data: Buffer
};

export class Header {

    /**
     * Build an header
     * @param cmd command number to use
     * @param session session id to use
     * @param data data buffer to send
     * @returns Encapsulated data
     */
    static build(cmd: number, session = 0x00, data: Buffer | number[] = []): Buffer
    {
        // Validate requested command
        if (!validateCommand(cmd)) throw new Error("Invalid Encapsulation Command!");
    
        const buf = Buffer.from(data);
    
        const send = {
            cmd: cmd,
            length: buf.length,
            session: session,
            status: 0x00,
            context: Buffer.alloc(8, 0x00),
            options: 0x00,
            data: buf
        };
    
        // Initialize header buffer to appropriate length
        let header = Buffer.alloc(24 + send.length);
    
        // Build header from encapsulation data
        header.writeUInt16LE(send.cmd, 0);
        header.writeUInt16LE(send.length, 2);
        header.writeUInt32LE(send.session, 4);
        header.writeUInt32LE(send.status, 8);
        send.context.copy(header, 12);
        header.writeUInt32LE(send.options, 20);
        send.data.copy(header, 24);
    
        return header;
    }
    
    /**
     * Parses an header
     * @param buf header to parse
     * @returns parsed header
     */
    static parse(buf: Buffer): ParsedHeader
    {
        if (!Buffer.isBuffer(buf)) throw new Error("header.parse accepts type <Buffer> only!");
    
        const received: ParsedHeader = {
            commandCode: buf.readUInt16LE(0),
            command: '',
            length: buf.readUInt16LE(2),
            session: buf.readUInt32LE(4),
            statusCode: buf.readUInt32LE(8),
            status: '',
            options: buf.readUInt32LE(20),
            data: Buffer.alloc(0)
        };
    
        // Get Returned Encapsulated Data
        let dataBuffer = Buffer.alloc(received.length);
        buf.copy(dataBuffer, 0, 24);
    
        received.data = dataBuffer;
        received.status = parseStatus(received.statusCode);
        received.command = Commands[received.commandCode];
    
        return received;
    };
}
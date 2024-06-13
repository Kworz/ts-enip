import { Header } from "./header";
import { CPF, ItemIDs } from "./cpf";

export enum Commands {
    
    NOP = 0x00,
    ListServices = 0x04,
    ListIdentity = 0x63,
    ListInterfaces = 0x64,
    RegisterSession = 0x65, // Begin Session Command
    UnregisterSession = 0x66, // Close Session Command
    SendRRData = 0x6f, // Send Unconnected Data Command
    SendUnitData = 0x70, // Send Connnected Data Command
    IndicateStatus = 0x72,
    Cancel = 0x73
};

/**
 * Checks if Command is a Valid Encapsulation Command
 * @param ecapsulation command
 * @returns test result
 */
export function validateCommand(cmd: number): cmd is Commands
{
    return Object.values(Commands).includes(cmd);
};

/**
 * Parses Encapulation Status Code to Human Readable Error Message.
 * @param status Status Code
 * @returns Human Readable Error Message
 */
export function parseStatus(status: number): string
{
    switch (status) {
        case 0x00:
            return "SUCCESS";
        case 0x01:
            return "FAIL: Sender issued an invalid encapsulation command.";
        case 0x02:
            return "FAIL: Insufficient memory resources to handle command.";
        case 0x03:
            return "FAIL: Poorly formed or incorrect data in encapsulation packet.";
        case 0x64:
            return "FAIL: Originator used an invalid session handle.";
        case 0x65:
            return "FAIL: Target received a message of invalid length.";
        case 0x69:
            return "FAIL: Unsupported encapsulation protocol revision.";
        default:
            return `FAIL: General failure <${status}> occured.`;
    }
};

export class Encapsulation
{

    /**
     * Creates a register session packet
     * @returns register Session packet
     */
    static registerSession(sessionID = 0x00): Buffer
    {
        const cmdBuf = Buffer.alloc(4);
        cmdBuf.writeUInt16LE(0x01, 0); // Protocol Version (Required to be 1)
        cmdBuf.writeUInt16LE(0x00, 2); // Opton Flags (Reserved for Future List)

        // Build Register Session Buffer and return it
        return Header.build(Commands.RegisterSession, sessionID, cmdBuf);
    };

    /**
     * Returns an Unregister Session Request Buffer
     * @returns unregister Session packet
     */
    static unregisterSession(session: number): Buffer {
        return Header.build(Commands.UnregisterSession, session);
    };

    /**
     * Returns a UCMM Encapsulated Packet Buffer
     * @returns sendRRData packet
     */
    static sendRRData(session: number, data: Buffer, timeout = 10): Buffer
    {
        let timeoutBuf = Buffer.alloc(6);
        timeoutBuf.writeUInt32LE(0x00, 0); // Interface Handle ID (Shall be 0 for CIP)
        timeoutBuf.writeUInt16LE(timeout, 4); // Timeout (sec)

        // Enclose in Common Packet Format
        let buf = CPF.build([
            { TypeID: ItemIDs.Null, data: Buffer.from([]) },
            { TypeID: ItemIDs.UCMM, data: data }
        ]);

        // Join Timeout Data with
        buf = Buffer.concat([timeoutBuf, buf]);

        // Build SendRRData Buffer
        return Header.build(Commands.SendRRData, session, buf);
    };

    /**
     * Returns a Connected Message Datagram (Transport Class 3) String
     * @returns sendUnitData packet
     */
    static sendUnitData(session: number, data: Buffer, ConnectionID: number, SequenceNumber: number): Buffer
    {

        let timeoutBuf = Buffer.alloc(6);
        timeoutBuf.writeUInt32LE(0x00, 0); // Interface Handle ID (Shall be 0 for CIP)
        timeoutBuf.writeUInt16LE(0x00, 4); // Timeout (sec) (Shall be 0 for Connected Messages)

        // Enclose in Common Packet Format
        const seqAddrBuf = Buffer.alloc(4);
        seqAddrBuf.writeUInt32LE(ConnectionID, 0);
        const seqNumberBuf = Buffer.alloc(2);
        seqNumberBuf.writeUInt16LE(SequenceNumber, 0);
        const ndata = Buffer.concat([
            seqNumberBuf,
            data
        ]);

        let buf = CPF.build([
            {
                TypeID: ItemIDs.ConnectionBased,
                data: seqAddrBuf
            },
            {
                TypeID: ItemIDs.ConnectedTransportPacket,
                data: ndata
            }
        ]);

        // Join Timeout Data with
        buf = Buffer.concat([timeoutBuf, buf]);

        // Build SendRRData Buffer
        return Header.build(Commands.SendUnitData, session, buf);
    };
}
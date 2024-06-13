/** Message router services */
export enum services {
    GET_INSTANCE_ATTRIBUTE_LIST = 0x55,
    GET_ATTRIBUTES = 0x03,
    GET_ATTRIBUTE_ALL = 0x01,
    GET_ATTRIBUTE_SINGLE = 0x0e,
    RESET = 0x05,
    START = 0x06,
    STOP = 0x07,
    CREATE = 0x08,
    DELETE = 0x09,
    MULTIPLE_SERVICE_PACKET = 0x0a,
    APPLY_ATTRIBUTES = 0x0d,
    SET_ATTRIBUTE_SINGLE = 0x10,
    FIND_NEXT = 0x11,
    READ_TAG = 0x4c,
    WRITE_TAG = 0x4d,
    READ_TAG_FRAGMENTED = 0x52,
    WRITE_TAG_FRAGMENTED = 0x53,
    READ_MODIFY_WRITE_TAG = 0x4e,
    FORWARD_OPEN = 0x54,
    FORWARD_CLOSE = 0x4E
};

/** Message router */
export type MessageRouterStruct = {
    service: number,
    generalStatusCode: number,
    extendedStatusLength: number,
    extendedStatus: number[] | null,
    data: Buffer | null
}

export class MessageRouter {

    /**
     * Builds a Message Router Request Buffer
     * @param service EtherNet/IP™ Service
     * @param path EtherNet/IP™ Path
     * @param data Data to send
     * @returns Encapsulated MessageRouter
     */
    static build(service: number, path: Buffer, data: Buffer): Buffer {
        const pathBuf = Buffer.from(path);
        const dataBuf = Buffer.from(data);
    
        const pathLen = Math.ceil(pathBuf.length / 2);
        const buf  = Buffer.alloc(2 + pathLen * 2 + dataBuf.length);
    
        buf.writeUInt8(service, 0); // Write Service Code to Buffer <USINT>
        buf.writeUInt8(pathLen, 1); // Write Length of EPATH (16 bit word length)
    
        pathBuf.copy(buf, 2); // Write EPATH to Buffer
        dataBuf.copy(buf, 2 + pathLen * 2); // Write Service Data to Buffer
    
        return buf;
    };

    /**
     * Parses a Message Router Request Buffer
     * @param buf Encapsulated Message router packet
     * @returns Message router parsed
     */
    static parse(buf: Buffer): MessageRouterStruct {
        let messageRouter: MessageRouterStruct  = {
            service: buf.readUInt8(0),
            generalStatusCode: buf.readUInt8(2),
            extendedStatusLength: buf.readUInt8(3),
            extendedStatus: null,
            data: null
        };
    
        // Build Extended Status Array
        let arr  = [];
        for (let i  = 0; i < messageRouter.extendedStatusLength; i++) {
            arr.push(buf.readUInt16LE(i * 2 + 4));
        }
        messageRouter.extendedStatus  = arr;
    
        // Get Starting Point of Message Router Data
        const dataStart  = messageRouter.extendedStatusLength * 2 + 4;
    
        // Initialize Message Router Data Buffer
        let data  = Buffer.alloc(buf.length - dataStart);
    
        // Copy Data to Message Router Data Buffer
        buf.copy(data, 0, dataStart);
        messageRouter.data  = data;
    
        return messageRouter;
    };
}
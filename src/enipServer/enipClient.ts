import { Socket } from "net";
import { EventEmitter } from "stream";
import { MessageRouter } from "../enip/cip/messageRouter";
import { CIP, CIPPacket } from "../enip/cip/path";
import { Encapsulation } from "../enip/encapsulation";
import { ENIPEventEmitter } from "../enip/events";
import { ENIPState } from "../enip/states";

export type ENIPDataVector = Record<number,(data: CIPPacket) => number>;

export class ENIPClient {

    private socket: Socket;
    private events: ENIPEventEmitter;

    private dataVector: ENIPDataVector;

    state: ENIPState = {
        TCPState: "established",
        session: { id: 0, state: "established"},
        connection: {id: 0, seq_num: 0, state: "established"},
        error: { code: 0, msg: "" }
    };

    constructor(socket: Socket, vector: ENIPDataVector) {
        this.socket = socket;
        this.events = new EventEmitter();
        this.dataVector = vector;

        this.socket.on("data", this.handleData.bind(this));
        this.socket.on("close", this.handleClose.bind(this));
        this.events.on("SendRRData Received", this.handlePacket.bind(this));
    }

    /** Ignore empty packets */
    private handlePacket(packets: Encapsulation.CPF.dataItem[])
    {
        for(const packet of packets)
        {
            if(packet.data.length == 0) continue;

            this.sendReponse(CIP.parseCIP(packet.data))
        }
    }

    /** Send a response computed by Vector function */
    private sendReponse(packet: CIPPacket)
    {
        const vectorFunction = this.dataVector[packet.service];

        if(vectorFunction === undefined)
            throw Error("Vector function not defined");

        const dataToSend = vectorFunction(packet);
        
        switch(packet.service)
        {
            case 0x0E: {

                const data = Buffer.alloc(4);
                data.writeUInt32LE(dataToSend);
                
                const MR = MessageRouter.build(0x8E, Buffer.from([0x00]), data);

                this.write(MR, false, 50);
                break;
            }
            case 0x10: {

                const returnedData = vectorFunction(packet);

                const data = Buffer.alloc(4);
                data.writeUInt32LE(returnedData);

                const MR = MessageRouter.build(0x90, Buffer.from([0x00]), data);

                this.write(MR, false, 50);
                break;
            }
            default: {
                throw Error("Service code " + packet.service + " not implemented");
            }
        }
    }

    /**
     * Writes Ethernet/IP Data to Socket as an Unconnected Message
     * or a Transport Class 1 Datagram
     */
    async write(data: Buffer, connected = false, timeout?: number): Promise<boolean> {
        if (this.state.session.state = "established")
        {
            if (connected === true) 
            {
                if (this.state.connection.state === "established") 
                {
                    (this.state.connection.seq_num > 0xffff) ? this.state.connection.seq_num = 0 : this.state.connection.seq_num++;
                }
                else
                {
                    throw new Error("Connected message request, but no connection established. Forgot forwardOpen?");
                }
            }

            if (this.state.session.id)
            {
                //If the packet should be connected, send UnitData otherwise send RRData
                const packet = (connected) ? Encapsulation.sendUnitData(this.state.session.id, data, this.state.connection.id, this.state.connection.seq_num) : Encapsulation.sendRRData(this.state.session.id, data, timeout ?? 10);
                const write = await new Promise<boolean>((resolve, reject) => {
                    
                    this.socket.write(packet, (err?: Error) => {

                        //timeout rejection
                        setTimeout(() => reject(false), timeout ?? 10000);

                        resolve(err === undefined ? true : false);
                    });
                });
                
                return write;
            }
            else
            {
                return false;
            }
        }
        else
        {
            return false;
        }
    }

    /**
     * Sends Unregister Session Command and Destroys Underlying TCP Socket
     * @deprecated
     */
    destroy(_error?: Error) {
        if (this.state.session.id != 0 && this.state.session.state === "established" && this.state.TCPState !== "unconnected") {
            this.socket.write(Encapsulation.unregisterSession(this.state.session.id), (_err?: Error) => {
                this.state.session.state = "unconnected";
            });
        }
    }

    /**
     * Sends an UnregisterSession command
     */
    close()
    {
        if (this.state.session.id != 0 && this.state.session.state === "established" && this.state.TCPState !== "unconnected") {
            this.socket.write(Encapsulation.unregisterSession(this.state.session.id));
        }
    }

    /**
     * Socket data event handler
     */
    private handleData(data: Buffer) {

        const encapsulatedData = Encapsulation.Header.parse(data);
        const { statusCode, status, commandCode } = encapsulatedData;

        if (statusCode !== 0) {
            console.log(`Error <${statusCode}>: `, status);

            this.state.error.code = statusCode;
            this.state.error.msg = status;

            this.events.emit("Session Registration Failed", this.state.error);
        }
        else {
            this.state.error.code = 0;
            this.state.error.msg = '';

            switch (commandCode) {
                case Encapsulation.Commands.RegisterSession: {
                    this.state.session.state = "established";
                    this.state.session.id = 0x01;
                    this.events.emit("Session Registered", this.state.session.id);

                    this.socket.write(Encapsulation.registerSession(this.state.session.id));
                    
                    break;
                }

                case Encapsulation.Commands.UnregisterSession: {

                    this.state.session.state = "unconnected";
                    this.events.emit("Session Unregistered");
                    break;
                }

                case Encapsulation.Commands.SendRRData: {
                    let buf1 = Buffer.alloc(encapsulatedData.length - 6); // length of Data - Interface Handle <UDINT> and Timeout <UINT>
                    encapsulatedData.data.copy(buf1, 0, 6);

                    const srrd = Encapsulation.CPF.parse(buf1);
                    this.events.emit("SendRRData Received", srrd);
                    break;
                }
                case Encapsulation.Commands.SendUnitData: {
                    let buf2 = Buffer.alloc(encapsulatedData.length - 6); // length of Data - Interface Handle <UDINT> and Timeout <UINT>
                    encapsulatedData.data.copy(buf2, 0, 6);

                    const sud = Encapsulation.CPF.parse(buf2);
                    this.events.emit("SendUnitData Received", sud);
                    break;
                }
                default:
                    {
                        this.events.emit("Unhandled Encapsulated Command Received", encapsulatedData);
                        console.log(encapsulatedData);
                    }
            }
        }
    }

    /**
     * Handle socket close
     */
    private handleClose(_hadError: boolean) {
        this.state.session.state = "unconnected";
        this.state.TCPState = "unconnected";
        this.socket.removeAllListeners("data");
        this.socket.removeAllListeners("close");
        this.socket.removeAllListeners("error");
    }
}
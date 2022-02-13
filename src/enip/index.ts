import { Socket } from "net";
import { EventEmitter } from "stream";
import { Encapsulation } from "./encapsulation";

export namespace ENIP
{
    type ENIPState = {
        TCPState: States
        session: { id: number, state: States },
        connection: { id: number, seq_num: number, state: States },
        error: { code: number, msg: string },
    }
    
    enum States {
        UNCONNECTED = "unconnected",
        ESTABLISHED = "established",
        ESTABLISHING = "establishing",
    }
    
    const EIP_PORT = 44818;

    interface ENIPEvents
    {
        "Session Registration Failed": (error: {code: number, msg: string}) => void;
        "Session Registered": (sessionid: number) => void;
        "Session Unregistered": () => void;
        "SendRRData Received": (data: Encapsulation.CPF.dataItem[]) => void;
        "SendUnitData Received": (data: Encapsulation.CPF.dataItem[]) => void;
        "Unhandled Encapsulated Command Received": (data: Encapsulation.Header.ParsedHeader) => void;
        "close": () => void;
    }

    declare interface ENIPEventEmitter extends EventEmitter
    {
        on<U extends keyof ENIPEvents>(event: U, listener: ENIPEvents[U]): this;
        emit<U extends keyof ENIPEvents>(event: U, ...args: Parameters<ENIPEvents[U]>): boolean
    }

    /**
     * Low Level Ethernet/IP
     */
    export class SocketController {
    
        state: ENIPState = {
            TCPState: States.UNCONNECTED,
            session: { id: 0, state: States.UNCONNECTED },
            connection: { id: 0, state: States.UNCONNECTED, seq_num: 0 },
            error: { code: 0, msg: '' }
        };
    
        socket: Socket;
    
        public events: ENIPEventEmitter;
    
        constructor() {
            this.socket = new Socket();
            this.events = new EventEmitter();
        }
    
        /**
         * Initializes Session with Desired IP Address or FQDN
         * and Returns a Promise with the Established Session ID
         */
        async connect(IP_ADDR: string, timeoutSP = 10000): Promise<number | undefined> {
    
            this.state.session.state = States.ESTABLISHING;
            this.state.TCPState = States.ESTABLISHING;
    
            /**
             * Connects to the controller using a raw TCP Socket 
             * and register ourselves using RegisterSession Method
             */
            const connectResult = await new Promise<boolean>((resolve) => {
                this.socket.connect(EIP_PORT, IP_ADDR);
    
                this.socket.once("connect", () => {
                    this.state.TCPState = States.ESTABLISHED;
                    resolve(true);
                });
    
                this.socket.once("error", () => () => {
                    resolve(false)
                    this.state.TCPState = States.UNCONNECTED;
                });
            });
    
            //@ts-ignore
            if (connectResult === true && this.state.TCPState === States.ESTABLISHED) {
                //Adding Sockets events
                this.socket.on("data", (data: Buffer) => { this.handleData(data); });
                this.socket.once("close", (hadError: boolean) => { this.handleClose(hadError); this.events.emit("close") });
    
                this.socket.write(Encapsulation.registerSession());
    
                const sessionID = await new Promise<number | undefined>((resolve) => {
    
                    setTimeout(() => resolve(undefined), timeoutSP);
    
                    this.events.on("Session Registered", (sessionid: number) => {
                        this.state.session.state = States.ESTABLISHED;
                        resolve(sessionid);
                    });
                    this.events.on("Session Registration Failed", error => {
                        this.state.error.code = error.code;
                        this.state.error.msg = "Failed to register Session";
    
                        resolve(undefined);
                    })
                });
    
                this.events.removeAllListeners("Session Registered");
                this.events.removeAllListeners("Session Registration Failed");
    
                return sessionID;
            }
            else {
                this.state.TCPState = States.UNCONNECTED;
                this.state.session.state = States.UNCONNECTED;
                this.state.error.msg = "Failed to connect to socket";
                return 0;
            }
        }
    
        /**
         * Writes Ethernet/IP Data to Socket as an Unconnected Message
         * or a Transport Class 1 Datagram
         */
        write(data: Buffer, connected = false, timeout?: number, cb?: (err?: Error) => void) {
            if (this.state.session.state = States.ESTABLISHED)
            {
                if (connected === true) 
                {
                    if (this.state.connection.state === States.ESTABLISHED) 
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
                    this.socket.write(packet, cb);
                }
            }
        }
    
        /**
         * Sends Unregister Session Command and Destroys Underlying TCP Socket
         * @deprecated
         */
        destroy(_error?: Error) {
            if (this.state.session.id != 0 && this.state.session.state === States.ESTABLISHED && this.state.TCPState !== States.UNCONNECTED) {
                this.socket.write(Encapsulation.unregisterSession(this.state.session.id), (_err?: Error) => {
                    this.state.session.state = States.UNCONNECTED;
                });
            }
        }

        /**
         * Sends an UnregisterSession command
         */
        close()
        {
            if (this.state.session.id != 0 && this.state.session.state === States.ESTABLISHED && this.state.TCPState !== States.UNCONNECTED) {
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
                        this.state.session.state = States.ESTABLISHED;
                        this.state.session.id = encapsulatedData.session;
                        this.events.emit("Session Registered", this.state.session.id);
                        break;
                    }
    
                    case Encapsulation.Commands.UnregisterSession: {
    
                        this.state.session.state = States.UNCONNECTED;
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
                        this.events.emit("Unhandled Encapsulated Command Received", encapsulatedData);
                }
            }
        }
    
        /**
         * Handle socket close
         */
        private handleClose(_hadError: boolean) {
            this.state.session.state = States.UNCONNECTED;
            this.state.TCPState = States.UNCONNECTED;
            this.socket.removeAllListeners("data");
            this.socket.removeAllListeners("close");
            this.socket.removeAllListeners("error");
        }
    }
}


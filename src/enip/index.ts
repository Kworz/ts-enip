import { Socket } from "net";
import { EventEmitter } from "stream";
import { Encapsulation } from "./encapsulation";
import type { ENIPEventEmitter } from "./events";
import type { ENIPState } from "./states";

export namespace ENIP
{    
    const EIP_PORT = 44818;

    /**
     * Low Level Ethernet/IP
     */
    export class SocketController {
    
        state: ENIPState = {
            TCPState: "unconnected",
            session: { id: 0, state: "unconnected" },
            connection: { id: 0, state: "unconnected", seq_num: 0 },
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
         * @param IpAddress IP Address or FQDN of the Controller
         * @param timeout Timeout in Milliseconds for Session Registration
         */
        async connect(IpAddress: string, timeout = 10000): Promise<number | undefined> {
    
            this.state.session.state = "establishing";
            this.state.TCPState = "establishing";
    
            /**
             * Connects to the controller using a raw TCP Socket 
             * and register ourselves using RegisterSession Method
             */
            const { connectResult, TCPState } = await new Promise<{ connectResult: boolean, TCPState: ENIPState["TCPState"] }>((resolve) => {
                this.socket.connect(EIP_PORT, IpAddress);
    
                this.socket.once("connect", () => {
                    resolve({ connectResult: true, TCPState: "established" });
                });
    
                this.socket.once("error", () => () => {
                    resolve({ connectResult: false, TCPState: "unconnected" });
                });
            });

            this.state.TCPState = TCPState;
    
            if (connectResult === true && this.state.TCPState === "established")
            {
                //Adding Sockets events
                this.socket.on("data", (data: Buffer) => { this.handleData(data); });
                this.socket.on("close", (hadError: boolean) => { this.handleClose(hadError); });
    
                this.socket.write(Encapsulation.registerSession());
    
                const sessionID = await new Promise<number | undefined>((resolve) => {
    
                    setTimeout(() => resolve(undefined), timeout);
    
                    this.events.on("Session Registered", (sessionid: number) => {
                        this.state.session.state = "established";
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
            else
            {
                this.state.TCPState = "unconnected";
                this.state.session.state = "unconnected";
                this.state.error.msg = "Failed to connect to socket";
                return undefined;
            }
        }
    
        /**
         * Writes Ethernet/IP Data to Socket as an Unconnected Message or a Transport Class 1 Datagram
         * @param data Data to be sent
         * @param connected If the message should be sent as a connected message
         * @param timeout Timeout in Milliseconds for the response
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
                    console.log("ts-enip: Session not registered")
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
         * @param data Data received from the socket
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
                        this.state.session.id = encapsulatedData.session;
                        this.events.emit("Session Registered", this.state.session.id);
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
                        this.events.emit("Unhandled Encapsulated Command Received", encapsulatedData);
                }
            }
        }
    
        /**
         * Handle socket close
         * @param _hadError If the socket closed due to an error
         */
        private handleClose(_hadError: boolean) {
            this.state.session.state = "unconnected";
            this.state.TCPState = "unconnected";

            this.events.emit("close");

            this.socket.removeAllListeners("data");
            this.socket.removeAllListeners("close");
            this.socket.removeAllListeners("error");
        }
    }
}


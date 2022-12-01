import { createServer, Server } from "net";
import { EventEmitter } from "stream";
import { Encapsulation } from "../enip/encapsulation";
import { ENIPState } from "../enip/states";
import { ENIPClient, ENIPDataVector } from "./enipClient";

export namespace ENIPServer
{
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
        once<U extends keyof ENIPEvents>(event: U, listener: ENIPEvents[U]): this;
        emit<U extends keyof ENIPEvents>(event: U, ...args: Parameters<ENIPEvents[U]>): boolean
    }

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
    
        private server: Server;
        private clients: ENIPClient[] = [];
    
        public events: ENIPEventEmitter;
    
        constructor(vector: ENIPDataVector) {
            this.server = createServer((client) => {
                console.log("client connected");
                this.clients.push(new ENIPClient(client, vector));
            });
            this.events = new EventEmitter();
        }

        async listen(IP_ADDR: string) {

            this.server.listen(EIP_PORT, () => {
                console.log("enip listen on port", EIP_PORT);
            });
        }
    }
}
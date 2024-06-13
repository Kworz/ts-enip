import { createServer, Server } from "net";
import { EventEmitter } from "stream";
import { Client, ENIPDataVector } from "./client";
import type { ENIPEventEmitter } from "../enip/events";

const EIP_PORT = 44818;

/** Server Socket controller */
export class ENIPServer {

    private server: Server;
    private clients: Client[] = [];

    public events: ENIPEventEmitter;

    constructor(vector: ENIPDataVector) {
        this.server = createServer((client) => {
            this.clients.push(new Client(client, vector));
            
        });

        this.events = new EventEmitter();
    }

    /**
     * Make Enip Server listening
     * @param port Port used by this server
     * @returns true if listening successfully, false if not.
     */
    async listen(port = EIP_PORT): Promise<boolean> {

        return new Promise<boolean>(resolve => {
            try {
                this.server.listen(port, () => resolve(true));
            } catch (ex) {
                resolve(false);
            }
        });
    }
}

export { ENIPDataVector };
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
            const onError = (err: NodeJS.ErrnoException) => {
                console.error(`ts-enip server: failed to listen on port ${port}: ${err.code ?? err.message}`);
                this.server.removeListener("listening", onListening);
                resolve(false);
            };
            const onListening = () => {
                this.server.removeListener("error", onError);
                resolve(true);
            };
            this.server.once("error", onError);
            this.server.once("listening", onListening);
            this.server.listen(port);
        });
    }

    /** Stop accepting new connections. */
    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.server.close(err => err ? reject(err) : resolve());
        });
    }
}

export { ENIPDataVector };
//const CIP = require("./cip");
//const { promiseTimeout } = require("../utilities");

import { lookup } from "dns";
import { Socket, isIPv4 } from "net";
import { promiseTimeout } from "../utils/utils";
import { unregisterSession, registerSession, sendRRData, sendUnitData, header, commands, CPF } from "./encapsulation";

type ENIPState = {
    TCP: { established: boolean, establishing: boolean },
    session: { id: number | null, establishing: boolean, established: boolean },
    connection: { id: number | null, establishing: boolean, established: boolean, seq_num: number },
    error: { code: number | null, msg: string | null },
}

const EIP_PORT = 44818;

/**
 * Low Level Ethernet/IP
 *
 * @class ENIP
 * @extends {Socket}
 * @fires ENIP#Session Registration Failed
 * @fires ENIP#Session Registered
 * @fires ENIP#Session Unregistered
 * @fires ENIP#SendRRData Received
 * @fires ENIP#SendUnitData Received
 * @fires ENIP#Unhandled Encapsulated Command Received
 */
export class ENIP extends Socket {
    state: ENIPState

    constructor() {
        super();

        this.state = {
            TCP: { establishing: false, established: false },
            session: { id: null, establishing: false, established: false },
            connection: { id: 0, establishing: false, established: false, seq_num: 0 },
            error: { code: null, msg: null }
        };

        // Initialize Event Handlers for Underlying Socket Class
        this._initializeEventHandlers();
    }

    // region Property Accessors
    /**
     * Returns an Object
     *  - <number> error code
     *  - <string> human readable error
     *
     * @readonly
     * @memberof ENIP
     */
    get error() {
        return this.state.error;
    }

    /**
     * Session Establishment In Progress
     *
     * @readonly
     * @memberof ENIP
     */
    get establishing() {
        return this.state.session.establishing;
    }
    /**
     * Session Established Successfully
     *
     * @readonly
     * @memberof ENIP
     */
    get established() {
        return this.state.session.established;
    }

    /**
     * Get ENIP Session ID
     *
     * @readonly
     * @memberof ENIP
     */
    get session_id() {
        return this.state.session.id;
    }

    /**
     * Various setters for Connection parameters
     *
     * @memberof ENIP
     */
    set establishing_conn(newEstablish) {
        if (typeof (newEstablish) !== "boolean") {
            throw new Error("Wrong type passed when setting connection: establishing parameter");
        }
        this.state.connection.establishing = newEstablish;
    }

    set established_conn(newEstablished) {
        if (typeof (newEstablished) !== "boolean") {
            throw new Error("Wrong type passed when setting connection: established parameter");
        }
        this.state.connection.established = newEstablished;
    }

    set id_conn(newID) {
        if (typeof (newID) !== "number") {
            throw new Error("Wrong type passed when setting connection: id parameter");
        }
        this.state.connection.id = newID;
    }

    set seq_conn(newSeq) {
        if (typeof (newSeq) !== "number") {
            throw new Error("Wrong type passed when setting connection: seq_numparameter");
        }
        this.state.connection.seq_num = newSeq;
    }

    /**
     * Various getters for Connection parameters
     *
     * @memberof ENIP
     */
    get establishing_conn() {
        return this.state.connection.establishing;
    }

    get established_conn() {
        return this.state.connection.established;
    }

    get id_conn() {
        return this.state.connection.id;
    }

    get seq_conn() {
        return this.state.connection.seq_num;
    }
    // endregion

    // region Public Method Definitions

    /**
     * Initializes Session with Desired IP Address or FQDN
     * and Returns a Promise with the Established Session ID
     *
     * @override
     * @param {string} IP_ADDR - IPv4 Address (can also accept a FQDN, provided port forwarding is configured correctly.)
     * @returns {Promise}
     * @memberof ENIP
     */
    async connect_enip(IP_ADDR: string, timeoutSP = 10000) {
        if (!IP_ADDR) {
            throw new Error("Controller <class> requires IP_ADDR <string>!!!");
        }
        await new Promise<void>((resolve, reject) => {
            lookup(IP_ADDR, (err, addr) => {
                if (err) reject(new Error("DNS Lookup failed for IP_ADDR " + IP_ADDR));

                if (!isIPv4(addr)) {
                    reject(new Error("Invalid IP_ADDR <string> passed to Controller <class>"));
                }
                resolve();
            });
        });

        this.state.session.establishing = true;
        this.state.TCP.establishing = true;

        const connectErr = new Error(
            "TIMEOUT occurred while attempting to establish TCP connection with Controller."
        );

        // Connect to Controller and Then Send Register Session Packet
        await promiseTimeout<void>(
            new Promise((resolve, reject) => {
                let socket = super.connect(
                    EIP_PORT,
                    IP_ADDR,
                    () => {
                        this.state.TCP.establishing = false;
                        this.state.TCP.established = true;

                        this.write(registerSession());
                        resolve();
                    }
                );

                socket.on('error', err => {
                    reject(new Error("SOCKET error"));
                })
            }),
            timeoutSP,
            connectErr
        );

        const sessionErr = new Error(
            "TIMEOUT occurred while attempting to establish Ethernet/IP session with Controller."
        );

        // Wait for Session to be Registered
        const sessid = await promiseTimeout(
            new Promise(resolve => {
                this.on("Session Registered", sessid => {
                    resolve(sessid);
                });

                this.on("Session Registration Failed", error => {
                    this.state.error.code = error;
                    this.state.error.msg = "Failed to Register Session";
                    resolve(null);
                });
            }),
            timeoutSP,
            sessionErr
        );

        // Clean Up Local Listeners
        this.removeAllListeners("Session Registered");
        this.removeAllListeners("Session Registration Failed");

        // Return Session ID
        return sessid;
    }

    /**
     * Writes Ethernet/IP Data to Socket as an Unconnected Message
     * or a Transport Class 1 Datagram
     *
     * NOTE: Cant Override Socket Write due to net.Socket.write
     *        implementation. =[. Thus, I am spinning up a new Method to
     *        handle it. Dont Use Enip.write, use this function instead.
     */
    write_cip(data: Buffer, connected = false, timeout?: number, cb?: (err?: Error) => void) {
        if (this.state.session.established)
        {
            if (connected === true) {
                if (this.state.connection.established === true)
                {
                    this.state.connection.seq_num += 1;
                    if (this.state.connection.seq_num > 0xffff) this.state.connection.seq_num = 0;
                }
                else {
                    throw new Error("Connected message request, but no connection established. Forgot forwardOpen?");
                }
            }
            if(this.state.session.id && this.state.connection.id)
            {
                const packet = connected
                    ? sendUnitData(this.state.session.id, data, this.state.connection.id, this.state.connection.seq_num)
                    : sendRRData(this.state.session.id, data, timeout ?? 10);
    
                this.write(packet, cb);
            }
        }
    }

    /**
     * Sends Unregister Session Command and Destroys Underlying TCP Socket
     *
     * @override
     * @param {Exception} exception - Gets passed to 'error' event handler
     * @memberof ENIP
     */
    destroy(error?: Error): this {
        if(this.state.session.id)
        {
            this.write(unregisterSession(this.state.session.id), () => {
                this.state.session.established = false;
                super.destroy(error);
            });
        }
        return this;
    }
    // endregion

    // region Private Method Definitions
    _initializeEventHandlers() {
        this.on("data", this._handleDataEvent);
        this.on("close", this._handleCloseEvent);
    }
    //endregion

    // region Event Handlers

    /**
     * @typedef EncapsulationData
     * @type {Object}
     * @property {number} commandCode - Ecapsulation Command Code
     * @property {string} command - Encapsulation Command String Interpretation
     * @property {number} length - Length of Encapsulated Data
     * @property {number} session - Session ID
     * @property {number} statusCode - Status Code
     * @property {string} status - Status Code String Interpretation
     * @property {number} options - Options (Typically 0x00)
     * @property {Buffer} data - Encapsulated Data Buffer
     */
    /*****************************************************************/

    /**
     * Socket.on('data) Event Handler
     *
     * @param {Buffer} - Data Received from Socket.on('data', ...)
     * @memberof ENIP
     */
    _handleDataEvent(data: Buffer) {

        const encapsulatedData = header.parse(data);
        const { statusCode, status, commandCode } = encapsulatedData;

        if (statusCode !== 0) {
            console.log(`Error <${statusCode}>:`);

            this.state.error.code = statusCode;
            this.state.error.msg = status;

            this.emit("Session Registration Failed", this.state.error);
        } else {
            this.state.error.code = null;
            this.state.error.msg = null;
            /* eslint-disable indent */
            switch (commandCode) {
                case commands.RegisterSession:
                    this.state.session.establishing = false;
                    this.state.session.established = true;
                    this.state.session.id = encapsulatedData.session;
                    this.emit("Session Registered", this.state.session.id);
                    break;

                case commands.UnregisterSession:
                    this.state.session.established = false;
                    this.emit("Session Unregistered");
                    break;

                case commands.SendRRData: {
                    let buf1 = Buffer.alloc(encapsulatedData.length - 6); // length of Data - Interface Handle <UDINT> and Timeout <UINT>
                    encapsulatedData.data.copy(buf1, 0, 6);

                    const srrd = CPF.parse(buf1);
                    this.emit("SendRRData Received", srrd);
                    break;
                }
                case commands.SendUnitData: {
                    let buf2 = Buffer.alloc(encapsulatedData.length - 6); // length of Data - Interface Handle <UDINT> and Timeout <UINT>
                    encapsulatedData.data.copy(buf2, 0, 6);

                    const sud = CPF.parse(buf2);
                    this.emit("SendUnitData Received", sud);
                    break;
                }
                default:
                    this.emit("Unhandled Encapsulated Command Received", encapsulatedData);
            }
            /* eslint-enable indent */
        }
    }

    /**
     * Socket.on('close',...) Event Handler
     *
     * @param {Boolean} hadError
     * @memberof ENIP
     */
    _handleCloseEvent(hadError: boolean) {
        this.state.session.established = false;
        this.state.TCP.established = false;
    }
}
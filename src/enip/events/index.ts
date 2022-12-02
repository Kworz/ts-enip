import type { EventEmitter } from "stream";
import type { Encapsulation } from "../encapsulation";

export declare interface ENIPEventEmitter extends EventEmitter
{
    on<U extends keyof ENIPEvents>(event: U, listener: ENIPEvents[U]): this;
    once<U extends keyof ENIPEvents>(event: U, listener: ENIPEvents[U]): this;
    emit<U extends keyof ENIPEvents>(event: U, ...args: Parameters<ENIPEvents[U]>): boolean
}

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
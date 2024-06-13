import type { EventEmitter } from "stream";
import type { dataItem } from "../encapsulation/cpf";
import type { ParsedHeader } from "../encapsulation/header";

export declare interface ENIPEventEmitter extends EventEmitter
{
    on<U extends keyof ENIPEvents>(event: U, listener: ENIPEvents[U]): this;
    once<U extends keyof ENIPEvents>(event: U, listener: ENIPEvents[U]): this;
    emit<U extends keyof ENIPEvents>(event: U, ...args: Parameters<ENIPEvents[U]>): boolean
}

interface ENIPEvents
{
    "Session Registration Failed": (error: { code: number, msg: string }) => void;
    "Session Registered": (sessionid: number) => void;
    "Session Unregistered": () => void;
    "SendRRData Received": (data: dataItem[]) => void;
    "SendUnitData Received": (data: dataItem[]) => void;
    "Unhandled Encapsulated Command Received": (data: ParsedHeader) => void;
    "close": () => void;
}
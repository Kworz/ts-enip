export type ENIPState = {
    TCPState: States
    session: { id: number, state: States },
    connection: { id: number, seq_num: number, state: States },
    error: { code: number, msg: string },
}

export type States = "unconnected" | "established" | "establishing";
import { ENIPClient } from "../";

const run = async () => {

    const socket = new ENIPClient(120000);
    
    console.log("ts-enip: Connecting to PLC");
    
    const sessid = await socket.connect("192.168.1.3");
    
    console.log("ts-enip: Connected to PLC", sessid);
    
    socket.events.addListener("close", () => {
        console.log("ts-enip: PLC Disconnected");
    });
}

run();

import { ENIP } from "../enip";
import { MessageRouter } from "../enip/cip/messageRouter";
import { Encapsulation } from "../enip/encapsulation";
import { ENIPServer } from "../enipServer";
import { ENIPDataVector } from "../enipServer/enipClient";

const local = true;

if(local)
{
    const actualData = Buffer.alloc(4);
    actualData.writeUInt32BE(0xF0F0F0F0);
    
    const vector: ENIPDataVector = {
        0x0E: (data) => {
            if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3)
                return actualData.readUInt32LE();
            else
                return 0;
        },
        0x10: (data) => {
            if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3 && data.data)
            {
                actualData.writeUint32LE(data.data.readUint32LE());
                console.log(actualData);
                return actualData.readUInt32LE();
            }
            else
                return 0;
        }
    }
    
    const server = new ENIPServer.SocketController(vector);
    
    server.listen("0.0.0.0");
    
    const controller = new ENIP.SocketController();
    
    controller.connect("127.0.0.1").then((session) => {
    
        if(session === undefined)
            return;
        
        //Path for ethernet ip protocol
        const idPath = Buffer.from([0x20, 0x04, 0x24, 0x96, 0x30, 0x03]);
        
        //Message router packet
        const MR = MessageRouter.build(0x0E, idPath, Buffer.alloc(0));
        
        //write data to the controller
        controller.write(MR, false, 10).then(() => {
            controller.events.once("SendRRData Received", (result: Encapsulation.CPF.dataItem[]) => {
                for(const packet of result)
                {
                    if(packet.data.length == 0) continue;
        
                    if(packet.TypeID == 178 && packet.data.length == (4 + (32 / 8)) && packet.data.readUIntLE(0, 1) == 0x8E)
                    {
                        console.log("packet received", packet.data);
                    }
                }
            });
        });
    
    });
}
else
{
    const k = new ENIP.SocketController();
    
    k.connect("192.168.1.4").then(async session => {
        if(session === undefined)
            return;
        
        //Path for ethernet ip protocol
        const idPath = Buffer.from([0x20, 0x04, 0x24, 0x96, 0x30, 0x03]);
        
        //Message router packet
        const MR = MessageRouter.build(0x0E, idPath, Buffer.alloc(0));
    
        for(let i = 0; i < 5; i++)
        {
            //write data to the controller
            k.write(MR, false, 10).then(() => {
                k.events.once("SendRRData Received", (result: Encapsulation.CPF.dataItem[]) => {
                    for(const packet of result)
                    {
                        if(packet.data.length == 0) continue;
    
                        const message = MessageRouter.parse(packet.data);
    
                        console.log(message);
    
                        if(packet.TypeID == 178 && packet.data.length == (4 + (32 / 8)) && packet.data.readUIntLE(0, 1) == 0x8E)
                        {
                            console.log("packet received", packet.data);
                        }
                    }
                });
            });
    
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    });
}

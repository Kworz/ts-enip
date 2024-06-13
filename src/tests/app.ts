import { SocketController } from "../enip";
import { MessageRouter } from "../enip/cip/messageRouter";
import { ENIPServer } from "../enipServer";
import type { ENIPDataVector } from "../enipServer/enipClient";
import { dataItem } from "../enip/encapsulation/cpf";

const local = true;

(async () => {
    console.log("statt");

    if(local)
    {
        const actualData = Buffer.alloc(4);
        actualData.writeUInt32BE(0xF0F0F0F0);
        
        const vector: ENIPDataVector = {
            0x0E: (data) => {
                if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3)
                    return actualData;
                else
                    return;
            },
            0x10: (data) => {
                if(data.path.class == 4 && data.path.instance == 150 && data.path.attribute == 3 && data.data)
                {
                    data.data.copy(actualData);
                    return actualData;
                }
                else
                    return;
            }
        }
        
        const server = new ENIPServer(vector);
        
        const listen = await server.listen();
    
        console.log(listen);
        
        const controller = new SocketController();
        
        controller.connect("127.0.0.1").then((session) => {

            console.log("connect");
        
            if(session === undefined)
                return;
            
            //Path for ethernet ip protocol
            const idPath = Buffer.from([0x20, 0x04, 0x24, 0x96, 0x30, 0x02]);
            
            //Message router packet
            const MR = MessageRouter.build(0x0E, idPath, Buffer.alloc(0));
            
            //write data to the controller
            const w = controller.write(MR, false, 10).then(() => {

                console.log("write");
                
                controller.events.once("SendRRData Received", (result: dataItem[]) => {
                    console.log("received", result);
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

            console.log(w);
        
        });
    }
    else
    {
        const k = new SocketController();
        
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
                    k.events.once("SendRRData Received", (result: dataItem[]) => {
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
})();
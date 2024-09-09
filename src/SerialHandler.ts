import { ReadlineParser, SerialPort } from 'serialport'
import { Settings } from './Settings';


export class SerialHandler {
    private static readonly UNOPENED_PORT_ERR_MSG: string = 'Port is not open';
    private static readonly NO_DEVICE_FOUND_ERR_MSG: string = 'File not found';

    private static readonly PORT_TIMEOUT_MS: number = 5000;

    private static readonly BAUD: number = 9600;
    private static PORT: string = Settings.getSettingValue('serial_port');



    private static ser: SerialPort;
    private static parser: ReadlineParser;

    private static currentlyConnected: boolean = false;
    private static softwareConnected: boolean = false;
    private static attemptingToConnect: boolean = false;


    public static init(
        serialEventHandler: (eventString: string) => void,
        connectionStatusCallback: (prevState: 0 | 1 | 2, status: 0 | 1 | 2) => void,
    ): void {
        this.PORT = Settings.getSettingValue('serial_port');
        
        let prevState: 0 | 1 | 2 = 0;
        this.monitorPhysicalConnection((nowConnected: boolean) => {
            let sentState: 0 | 1 | 2 = 0;
            if (!SerialHandler.currentlyConnected && !nowConnected) { // Not connected before,still not connected now
                // Do nothing, keep waiting for connection
                SerialHandler.softwareConnected = false;
                SerialHandler.attemptingToConnect = false;
                sentState = 0;


            } else if (!SerialHandler.currentlyConnected && nowConnected) { // Not connected before, connected now
                sentState = SerialHandler.softwareConnected ? 2 : 1;

                if (!SerialHandler.attemptingToConnect || !SerialHandler.softwareConnected) {
                    this.establishSerial().then((serialConnected) => {
                        SerialHandler.attemptingToConnect = serialConnected;
                        if (serialConnected) {
                            this.attemptConnection().then(() => {
                                SerialHandler.attemptingToConnect = false;
                                SerialHandler.softwareConnected = true;
                                sentState = 2;
                                this.listen(serialEventHandler);
                            })
                        }
                    });
                }



            } else if (SerialHandler.currentlyConnected && nowConnected) { // Connected before, connected now
                sentState = SerialHandler.softwareConnected ? 2 : 1;


                // Do nothing, maintain connection
            } else if (SerialHandler.currentlyConnected && !nowConnected) { // Connected before, not connected now
                SerialHandler.softwareConnected = false;
                SerialHandler.attemptingToConnect = false;
                sentState = 0;
                this.stop()
            }
            connectionStatusCallback(prevState, sentState);
            prevState = sentState;
            SerialHandler.currentlyConnected = nowConnected;
        });

    }

    public static stop(): void {
        this.write('pc_exit', () => {
            this.ser?.close((err) => {
                if (err) {
                    if (err.message === this.UNOPENED_PORT_ERR_MSG) { // Port is not opened
                        // Do nothing
                    } else {
                        console.log("Error closing serial port.");
                        console.log(err);
                    }
                }
            });
        }, true)

    }


    public static async monitorPhysicalConnection(
        isConnectedCallback: (connected: boolean) => void
    ) {
        setInterval(async () => {
            let ports: any[] = await SerialPort.list();
            const scannerPort = ports.filter(
                (port: any) => port.path === this.PORT
            );

            isConnectedCallback(scannerPort.length !== 0);
        }, 1000);
    }


    private static async establishSerial(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.ser = new SerialPort({
                path: this.PORT,
                baudRate: this.BAUD,
            },
                (err) => {
                    if (err) {
                        console.log("Error opening serial port.");
                        if (err.message.includes(this.NO_DEVICE_FOUND_ERR_MSG)) {
                            console.log("\tDevice (under COM3) not found.");
                        } else {
                            console.log('\t' + err);
                        }
                        resolve(false);
                    }
                    this.parser = this.ser.pipe(new ReadlineParser({ delimiter: '\n' }));
                    console.log(`Established serial connection on ${this.PORT}`);

                    resolve(true);
                }
            );
        });

    }


    public static async attemptConnection(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            console.log(`Listening for 'pi_ready' from linkedpad...`);
            const f = (d: any) => {
                const data: string[] = (d.toString() as string).trim().split("\n");

                for (const line of data) {
                    if (line === 'pi_ready') {
                        console.log("Connection formed with Pi.");
                        this.write('pc_ready', undefined, false);
                        this.parser.removeListener('data', f)
                        resolve(true); // Resolves when a connection has been made
                    }
                }
            }
            this.parser.on('data', f);
        });
    }


    public static listen(serialHandler: (eventString: string) => void): void {
        this.parser.on('data', d => {
            const data: string[] = (d.toString() as string).trim().split("\n");

            for (const line of data) {
                switch (line) {
                    case 'pi_ready': {
                        this.softwareConnected = true;
                        this.write('pc_ready', undefined, false);
                        break;
                    }
                    case 'pi_exit': {
                        console.log("Linked Pad exiting");
                        this.softwareConnected = false;
                        break;
                    }
                    default: {
                        serialHandler(line);
                        break;
                    }
                }


            }


        });
        console.log("Listening to serial...");
    }

    private static async maintainConnection() {
        setInterval(() => {
            if (this.softwareConnected) {

            }
        }, this.PORT_TIMEOUT_MS);
    }



    public static write(data: string, callback?: (err: any) => void, log: boolean = false): void {
        this.ser?.write(data + "\n", (err) => {
            if (callback !== undefined) {
                callback(err);
            }
            if (err) {
                console.log(`Error writing "${data}"`);
                console.log(err);
                return;
            }
            if (log) {
                console.log(`Writing '${data}' to serial...`);
            }
        });
    }






}
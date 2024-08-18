import { InterByteTimeoutParser, SerialPort } from 'serialport'


export class SerialHandler {
    private static readonly UNOPENED_PORT_ERR_MSG: string = 'Port is not open';
    private static readonly NO_DEVICE_FOUND_ERR_MSG: string = 'Opening COM3: File not found';


    private static readonly PORT: string = 'COM3';
    private static readonly BAUD: number = 9600;


    private static ser: SerialPort;
    private static parser: InterByteTimeoutParser;

    public static init(
        onClickCallback: (row: string, col: string) => void,
        onPortOpenedCallback: () => void,
        onConnectionSuccessCallback: () => void
    ): void {

        this.establishSerial().then(() => {
            onPortOpenedCallback()
            this.attemptConnection().then(() => {
                onConnectionSuccessCallback();
                this.listen(onClickCallback);
            });
        });
    }

    public static stop(): void {
        this.ser?.close((err) => {
            if (err) {
                if (err.message === this.UNOPENED_PORT_ERR_MSG) { // Port is not opened
                    // Do nothing
                } else {
                    console.log("Error closing serial port.")
                    console.log(err)
                }

            }
        });
    }


    private static async establishSerial(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.ser !== undefined) {
                this.ser.close();
                this.ser = undefined;
            }

            this.ser = new SerialPort({
                path: this.PORT,
                baudRate: this.BAUD,
            },

                (err) => {
                    if (err) {
                        console.log("Error opening serial port.");
                        if (err.message === this.NO_DEVICE_FOUND_ERR_MSG) {
                            console.log("\tDevice (under COM3) not found.");
                        } else {
                            console.log('\t' + err);
                        }
                        return;
                    }
                    this.parser = this.ser.pipe(new InterByteTimeoutParser({ interval: 250 }));
                    console.log(`Established serial connection on ${this.PORT}`);
                    resolve(true);
                });
        });

    }


    public static async attemptConnection(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            console.log(`Listening for 'pi_ready' from linkedpad...`);
            this.parser.on('data', d => {
                const data: string = (d.toString() as string).trim();
                if (data === 'pi_ready') {
                    console.log("Connection formed with Pi.");
                    this.write('pc_ready');
                    resolve(true); // Resolves when a connection has been made
                }
            });
        });
    }


    public static listen(onClickCallback: (row: string, col: string) => void): void {
        this.parser.on('data', d => {
            const data: string = (d.toString() as string).trim();

            if (data === 'pi_ready') {
                console.log("Reconnected with linked pad.");
                this.write('pc_ready');
                return;
            }

            const rowCol: [string, string] = SerialHandler.parseToRowCol(data);
            if (rowCol) {
                onClickCallback(rowCol[0], rowCol[1])
            }
        });
        console.log("Listening to serial...")
    }

    private static parseToRowCol(s: string): [string, string] | undefined {
        const data: string = (s.toString() as string).trim();

        console.log("Serial (RAW):");
        console.log(s);


        if (data.length !== 2) {
            return undefined;
            // Maybe add more checks here?
        }

        return [data[0], data[1]];
    }

    public static write(data: string): void {
        this.ser.write(data + "\n", (err) => {
            if (err) {
                console.log(`Error writing "${data}"`);
                console.log(err);
                return;
            }
            console.log(`Writing '${data}' to serial...`);
        });
    }






}
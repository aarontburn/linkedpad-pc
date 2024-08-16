import { ReadlineParser, SerialPort } from 'serialport'


export class SerialHandler {

    private static readonly PORT: string = 'COM3';
    private static readonly BAUD: number = 9600;


    private static ser: SerialPort;
    private static parser: ReadlineParser;

    public static init(onClickCallback: (row: string, col: string) => void): void {
        this.establishSerial().then(() => {
            this.attemptConnection().then(() => this.listen(onClickCallback))
        })
    }

    public static stop(): void {
        this.ser?.close((err) => {
            if (err) {
                console.log("Error closing serial port")
                console.log(err)
            }
        });
    }


    private static async establishSerial(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (this.ser !== undefined) {
                this.ser.close()
                this.ser = undefined;
            }

            this.ser = new SerialPort({
                path: this.PORT,
                baudRate: this.BAUD
            },
                (err) => {
                    if (err) {
                        console.log("Error opening serial port.")
                        console.log(err)
                        return;
                    }
                    this.parser = this.ser.pipe(new ReadlineParser({ delimiter: '\n' }));
                    console.log(`Established serial connection on ${this.PORT}`);
                    resolve();
                });


        })

    }


    public static async attemptConnection(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            let connected: boolean = false;

            this.parser.on('data', d => {
                const data: string = (d.toString() as string).trim();
                if (data === 'pi_ready') {
                    connected = true;
                    console.log("Connection formed with Pi.")
                    resolve(); // Resolves when a connection has been made
                }
            });

            while (connected === false) {
                this.write('pc_ready')
                await new Promise(f => setTimeout(f, 1000));
            }
        });
    }


    public static listen(onClickCallback: (row: string, col: string) => void): void {
        this.parser.on('data', d => {
            const rowCol: [string, string] = SerialHandler.parseToRowCol(d);
            if (rowCol) {
                onClickCallback(rowCol[0], rowCol[1])
            }
        });
        console.log("Listening to serial...")
    }

    private static parseToRowCol(s: any): [string, string] | undefined {
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
                console.log(err)
                return;
            }
            console.log(`Writing '${data}' to serial...`);
        })
    }




}
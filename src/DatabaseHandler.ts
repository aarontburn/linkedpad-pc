import { Collection, Db, MongoClient } from "mongodb";
import { ColorHandler, RGB } from "./ColorHandler";


export class DatabaseHandler {
    private static readonly ACCESS_ID = ':3';
    private static readonly URI = "mongodb+srv://admin:j2MzVYcewmPjnzrG@linkedpad.qrzkm98.mongodb.net/?retryWrites=true&w=majority&appName=linkedpad";

    private static client: MongoClient;
    private static database: Db;
    private static collection: Collection;

    private static ready: boolean = false;

    private static readonly KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));

    private static readonly HEADERS: string[] = ["H0", "H1", "H2", "H3"];

    private static recalibrate: () => void;
    private static setLight: (row: string, col: string, rgb: RGB) => void;



    public static async initDatabase(recalibrate: () => void, setLight: (row: string, col: string, rgb: RGB) => void) {
        this.client = new MongoClient(this.URI);
        this.database = this.client.db("pad_data");
        this.collection = this.database.collection("data");


        this.recalibrate = recalibrate;
        this.setLight = setLight;
        console.log("Initializing database...");

        this.checkDatabase().then(() => {
            this.collection.findOne({}).then(async data => {
                this.ready = true;
                await recalibrate();
                this.listen().catch(() => this.initDatabase(recalibrate, setLight)); // Reboot if error
            });
        });
    }

    private static async checkDatabase() {
        if (await this.collection.estimatedDocumentCount() === 1) {
            const entry = await this.getObject();

            if (entry !== null) {
                if (Object.keys(entry).sort().toString() === [...this.KEYS, '_id', 'accessID'].sort().toString()) { // All keys are valid
                    console.log("Database is properly initialized.");
                    return;
                }
            }
        }

        console.log("WARNING: Database needs to be re-setup.");
        await this.collection.deleteMany({});
        await this.reset();
    }

    /**
     *  Listens to any database changes.
     */
    private static async listen(): Promise<void> {
        try {
            const changeStream: any = this.collection.watch();
            console.log("Listening for changes...");

            // Print change events as they occur
            for await (const change of changeStream) {
                if (change && change.updateDescription && change.updateDescription.updatedFields) {
                    this.onDatabaseChange(change.updateDescription.updatedFields);
                }
            }
            await changeStream.close();

        } finally {
            await this.client.close();
        }
    }

    /**
    *  An event that triggers when the database object is modified.
    *  @param changeObject     An object containing all keys and new states for each button.
    */
    private static async onDatabaseChange(changeObject: { [rowCol: string]: RGB }) {
        for (const rowCol in changeObject) {
            if (!this.KEYS.includes(rowCol)) { // Maybe not needed?
                continue;
            }

            const row: string = rowCol[0];
            const col: string = rowCol[1];
            const newValue: RGB = changeObject[rowCol];

            this.setLight(row, col, newValue);
        }
    }


    public static async getObject() {
        return await this.collection.findOne({ 'accessID': this.ACCESS_ID });
    }

    public static async onKeyPress(row: string, col: string, localState: { [rowCol: string]: RGB }): Promise<void> {
        if (!this.ready) {
            return;
        }

        try {
            const isOff: boolean = ColorHandler.isEqual(localState[row + col], ColorHandler.OFF);

            await this.collection.findOneAndUpdate(
                { 'accessID': this.ACCESS_ID },
                { "$set": { [row + col]: isOff ? ColorHandler.getCurrentColor() : ColorHandler.OFF } }
            )
        } catch (e) {
            console.log("DB no longer connected. Reinitializing...");
            this.initDatabase(this.recalibrate, this.setLight);
        }
    }


    /**
     *  Reset all buttons to 0
     */
    public static async reset() {
        // Iterate over A0, A1, ... D3, D4 and reset their entries to 0
        const object: any = {};
        for (const key of this.KEYS) {
            object[key] = ColorHandler.OFF;
        }
        object['accessID'] = this.ACCESS_ID;
        const result = await this.collection.findOneAndUpdate(
            { 'accessID': this.ACCESS_ID },
            { '$set': object }, { returnDocument: 'after', upsert: true });

        for (const key in result) {
            this.setLight(key[0], key[1], [0, 0, 0]);
        }
    }








}
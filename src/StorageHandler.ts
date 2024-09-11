import * as fs from "fs";
import { app } from 'electron';

export class StorageHandler {
    public static readonly PATH: string = app.getPath("home") + (!process.argv.includes('--dev') ? "/.linkedpad/" : '/.linkedpad_dev/');

    /**
     *  Creates necessary directories. Should not be called by any module.
     */
    public static async _createDirectories(): Promise<void> {
        await Promise.all([
            fs.promises.mkdir(this.PATH, { recursive: true })
        ]);
    }


    public static async writeToStorage(fileName: string, contents: string): Promise<void> {
        await this._createDirectories();
        fs.writeFileSync(this.PATH + fileName, contents);
    }



    public static readFromModuleStorage(fileName: string, encoding: string = 'utf-8'): string | null {
        const filePath: string = this.PATH + fileName;
        try {
            const content: string = fs.readFileSync(filePath, { encoding: (encoding as BufferEncoding) });
            return content;
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }

            console.log("File not found: " + filePath);
        }

        return null;

    }


}
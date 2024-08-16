const fs = require("fs")
const path = require("path")

const PWD = path.join(__dirname, 'src');

// These are all the files to copy into the "dist" folder
const pathsToCopy = [
    PWD + "/view",
];

pathsToCopy.forEach(file => {
    console.log("Copying `" + file + "` to `" + file.replace("src", "dist") + "`")

    if (!file.includes(".")) {
        fs.cpSync(file, file.replace("src", "dist"), { recursive: true })
        return;
    }

    fs.copyFileSync(file, file.replace("src", "dist"))
});





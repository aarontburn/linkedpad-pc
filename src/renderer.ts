(() => {
    type RGB = [number, number, number];

    const CHANNEL_NAME: string = ":3";

    function sendToProcess(eventType: string, ...data: any[]) {
        return window.ipc.send(CHANNEL_NAME, eventType, ...data);
    }

    function isRGBEqual(rgb1: RGB, rgb2: RGB): boolean {
        return JSON.stringify([...rgb1]) === JSON.stringify([...rgb2]);
    }

    function rgbToHex(color: RGB): string {
        const componentToHex: (c: number) => string = (c: number) => {
            const hex: string = c.toString(16);
            return hex.length === 1 ? "0" + hex : hex;
        }

        return "#" + componentToHex(color[0]) + componentToHex(color[1]) + componentToHex(color[2]);
    }

    function hexToRGB(hex: string): RGB {
        const bigint: number = parseInt(hex, 16);
        const r: number = (bigint >> 16) & 255;
        const g: number = (bigint >> 8) & 255;
        const b: number = bigint & 255;

        return [r, g, b];
    }

    function getElement(id: string): HTMLElement {
        const query: HTMLElement = document.getElementById(id);
        if (query === null) {
            console.log("Could not find element with ID: " + id);
            return undefined
        }
        return query;
    }

    sendToProcess("init");


    const KEYS: string[] = ["A", "B", "C", "D"]
        .flatMap(row => ["0", "1", "2", "3"]
            .map(col => row + col));

    const HEADERS: string[] = ["H0", "H1", "H2", "H3"];

    const NO_KEY: string = 'Ø';

    let keyMap: { [rowCol: string]: (string | string[]) } = undefined;

    let selectedKey: string = undefined;
    let selectedKeySlot: number = 0;
    let localState: { [rowCol: string]: RGB } = (() => {
        const obj: { [rowCol: string]: RGB } = {};
        for (const rowCol of KEYS) {
            obj[rowCol] = [0, 0, 0];
        }
        return obj;
    })();
    let inLinkedMode: boolean = false;

    window.ipc.on(CHANNEL_NAME, async (_, eventType: string, ...data: any[]) => {
        switch (eventType) {
            case 'light-change': {
                const state: { [rowCol: string]: RGB } = data[0];

                for (const rowCol in state) {
                    const rgb: RGB = state[rowCol];
                    localState[rowCol] = rgb;

                    if (inLinkedMode) {
                        getElement(rowCol).style.backgroundColor = isRGBEqual(rgb, [0, 0, 0]) ? 'transparent' : `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
                    }
                }

                break;
            }
            case 'key-options': {
                populateKeys(data[0]);
                break;
            }
            case 'update-keys': {
                keyMap = data[0];
                break;
            }
            case 'color-options': {
                const colors: RGB[] = data[0];

                for (const rgb of colors) {
                    const hex: string = rgbToHex(rgb).substring(1); // get rid of the #
                    getElement('color-list').insertAdjacentHTML('beforeend', `
                        <div 
                            class='color'  
                            style='background-color: rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]});'
                            id='color-${hex}'
                            >
                        </div>
                        `
                    )

                    const element: HTMLElement = getElement(`color-${hex}`);
                    element.addEventListener('click', () => {
                        sendToProcess('selected-color-changed', hex);
                    });

                }
                break;
            }
            case 'selected-color': {
                setSelectedColor(data[0])
                break;
            }
            case 'brightness-changed': {
                const brightness: number = data[0];
                const percent: number = Math.round(brightness * 100)
                getElement('brightness-label').innerHTML = `Brightness (${percent}%)`;
                (getElement('brightness-slider') as HTMLInputElement).value = `${percent}`;
                break;
            }
            case 'connection-status': {
                const status: number = data[0];
                console.log(status)
            }

        }
    });


    let prevSelectedColor: HTMLElement = undefined;
    function setSelectedColor(rgb: RGB): void {
        const hex: string = rgbToHex(rgb).substring(1);
        if (prevSelectedColor) {
            prevSelectedColor.style.outline = '';
        }
        const newColor: HTMLElement = getElement(`color-${hex}`);
        newColor.style.outline = 'white solid';
        prevSelectedColor = newColor;
    }


    const linkedModeToggle: HTMLInputElement = getElement('linked-mode-slider') as HTMLInputElement;
    linkedModeToggle.addEventListener('change', () => {
        inLinkedMode = linkedModeToggle.checked;
        sendToProcess('linked-mode', inLinkedMode);

        if (selectedKey !== undefined) {
            getElement(selectedKey).style.borderColor = '';
        }
        selectedKey = undefined;

        getElement('close-key-settings').click();
        getElement('key-list-row').style.height = inLinkedMode ? '0' : '100%'; // Collapse key chooser

        for (const rowCol of KEYS) {
            const rgb: RGB = localState[rowCol];
            getElement(rowCol).style.backgroundColor = inLinkedMode && !isRGBEqual(rgb, [0, 0, 0])
                ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`
                : 'transparent'
        }


        Array.from(document.getElementsByClassName('linked-settings')).forEach((element: HTMLElement) => {
            element.style.opacity = inLinkedMode ? '1' : '0';
            element.style.width = inLinkedMode ? '30%' : '0';
            element.style.margin = inLinkedMode ? '0 15px' : '0 0';
            element.style.pointerEvents = inLinkedMode ? 'all' : 'none';
        
        });
    });

    const brightnessSlider: HTMLInputElement = getElement('brightness-slider') as HTMLInputElement;
    brightnessSlider.addEventListener('input', () => {
        sendToProcess('brightness-modified', brightnessSlider.value);
    });

    const keySettings: HTMLElement = getElement('key-settings');
    getElement('close-key-settings').addEventListener('click', () => {
        keySettings.style.opacity = '0';
        keySettings.style.marginLeft = '0';
        keySettings.style.width = '0';
        keySettings.style.pointerEvents = 'none';

        if (selectedKey !== undefined) {
            getElement(selectedKey).style.borderColor = '';
        }
        selectedKey = undefined;
    });

    const toggle: HTMLElement = getElement('keys-text-toggle');
    const textToggle: HTMLElement = getElement('text-toggle')
    const keyToggle: HTMLElement = getElement('key-toggle')
    toggle.addEventListener('change', () => {
        textToggle.style.display = !(toggle as HTMLInputElement).checked ? 'none' : 'inline-block';
        keyToggle.style.display = (toggle as HTMLInputElement).checked ? 'none' : 'flex';
    });



    for (let i = 0; i < 4; i++) {
        getElement(`key-slot-${i}`).addEventListener('click', () => {
            setSelectedKey(selectedKey, i);
        });
    }


    getElement('save-button').addEventListener('click', () => {
        // Get key or text mode
        const useTextMode: boolean = (getElement('keys-text-toggle') as HTMLInputElement).checked;

        // If text mode, get text input
        if (useTextMode) {
            const text: string = (getElement('text-toggle') as HTMLInputElement).value;
            sendToProcess('set-key', selectedKey, text);
            return;
        }

        // Otherwise get each key slot
        const keySlotValues: string[] = [];
        for (let i = 0; i < 4; i++) {
            const slotValue: string = getElement(`key-slot-${i}`).innerHTML;
            keySlotValues.push(slotValue === NO_KEY ? null : slotValue);
        }
        sendToProcess('set-key', selectedKey, keySlotValues);
    });


    const selectedKeyLabel: HTMLElement = getElement('selected-key-label');
    function setSelectedKey(rowCol: string, slotNum: number = 0) {
        if (slotNum < 0 || slotNum > 3) {
            console.log("Invalid key slot passed: " + slotNum)
            return
        }


        if (inLinkedMode) { // dont update in linked mode
            return;
        }

        if (selectedKey !== rowCol) {
            if (selectedKey !== undefined) {
                getElement(selectedKey).style.borderColor = '';
            }
            selectedKey = rowCol;
            selectedKeyLabel.innerHTML = rowCol;



            const recordedKey: string | string[] = keyMap[selectedKey];
            const toggle: HTMLInputElement = getElement('keys-text-toggle') as HTMLInputElement;
            if (typeof recordedKey === 'string') { // Text mode
                toggle.checked = true;
                toggle.dispatchEvent(new Event('change'))

                for (let i = 0; i < 4; i++) {
                    getElement(`key-slot-${i}`).innerHTML = NO_KEY; // Or existing keys
                }

                (getElement('text-toggle') as HTMLInputElement).value = recordedKey;
            } else {
                toggle.checked = false;
                toggle.dispatchEvent(new Event('change'));
                (getElement('text-toggle') as HTMLInputElement).value = '';

                for (let i = 0; i < 4; i++) {
                    getElement(`key-slot-${i}`).innerHTML = recordedKey[i] === null ? NO_KEY : recordedKey[i]; // Or existing keys
                }
            }

        }

        getElement(`key-slot-${selectedKeySlot}`).style.borderColor = '';
        getElement(`key-slot-${slotNum}`).style.borderColor = 'var(--accent-color)';
        selectedKeySlot = slotNum;
        getElement(rowCol).style.borderColor = 'var(--accent-color)';
    }



    function buildPadUI() {
        const head: HTMLElement = getElement('head');
        const table: HTMLElement = getElement('table');

        // Headers
        let h: string = '<tr>';
        for (let i = 0; i < HEADERS.length; i++) {
            h += `<td class='pad-key' id='${HEADERS[i]}'>${HEADERS[i]}</td>`;
        }
        head.insertAdjacentHTML('beforeend', h + '</tr>');

        // Buttons
        let s: string = '<tr>';
        for (let i = 0; i < KEYS.length; i++) {
            s += `<td class='pad-key' id='${KEYS[i]}'>${KEYS[i]}</td>`;
            if (i > 0 && i % 4 === 3) {
                table.insertAdjacentHTML('beforeend', s + '</tr>');
                s = '<tr>';
            }
        }

        const keySettings: HTMLElement = getElement('key-settings');
        for (const rowCol of [...KEYS, ...HEADERS]) {
            getElement(rowCol).addEventListener('click', () => {
                if (inLinkedMode) {
                    sendToProcess('button-press', rowCol[0], rowCol[1]);
                    return;
                }
                keySettings.style.opacity = '1';
                keySettings.style.marginLeft = '50px';
                keySettings.style.width = '255px';
                keySettings.style.pointerEvents = 'all';

                setSelectedKey(rowCol, 0);
            });
        }
    }
    buildPadUI();



    function populateKeys(groups: { name: string, [key: string]: string }[]) {
        const keyBox: HTMLElement = getElement('keys')
        const groupBox: HTMLElement = getElement('type-list')

        for (const group of groups) {
            const groupName: string = group['name'];
            groupBox.insertAdjacentHTML('beforeend', `<p id='${groupName}'>${groupName}</p>`);

            getElement(groupName).addEventListener('click', () => {
                // Swap tabs
                while (keyBox.firstChild) {
                    keyBox.removeChild(keyBox.firstChild);
                }

                const noneKey: string = `
                    <div class='key' id='key-none'>
                        <p>${NO_KEY}</p>
                    </div>
                `
                keyBox.insertAdjacentHTML("beforeend", noneKey)
                getElement('key-none').addEventListener('click', () => {
                    setCurrentSlot(undefined);
                });

                for (const keyName in group) {
                    if (keyName === 'name') {
                        continue;
                    }

                    const html: string = `
                        <div class='key' id='key-${keyName}'>
                            <p>${keyName}</p>
                        </div>
                    `
                    keyBox.insertAdjacentHTML("beforeend", html)
                    getElement(`key-${keyName}`).addEventListener('click', () => {
                        setCurrentSlot(keyName)
                    });
                }
            })
        }
        getElement(groups[0]['name']).click();
    }

    function setCurrentSlot(value: string | undefined): void {
        if (selectedKey === undefined) {
            return;
        }

        getElement(`key-slot-${selectedKeySlot}`).innerHTML = value ?? NO_KEY;
    }



})();
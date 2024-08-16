(() => {

    const CHANNEL_NAME: string = ":3";


    function sendToProcess(eventType: string, ...data: any[]) {
        return window.ipc.send(CHANNEL_NAME, eventType, ...data);
    }


    function getElement(id: string): HTMLElement {
        const query: HTMLElement = document.getElementById(id);
        if (query === undefined) {
            console.log("Could not find element with ID: " + id)
        }
        return query
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

    window.ipc.on(CHANNEL_NAME, async (_, eventType: string, ...data: any[]) => {
        switch (eventType) {
            case 'light-change': {
                // const state: any = data[0];
                // for (const button in state) {
                //     getElement(button).style.backgroundColor = `rgb(${state[button][0]}, ${state[button][1]}, ${state[button][2]})`
                // }
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
        }
    });


    const linkedModeToggle: HTMLInputElement = getElement('linked-mode-slider') as HTMLInputElement;
    linkedModeToggle.addEventListener('change', () => {
        sendToProcess('linked-mode', linkedModeToggle.checked);
    });


    const toggle: HTMLElement = getElement('keys-text-toggle');
    const textToggle: HTMLElement = getElement('text-toggle')
    const keyToggle: HTMLElement = getElement('key-toggle')
    toggle.addEventListener('change', () => {
        textToggle.style.display = !(toggle as any)['checked'] ? 'none' : 'inline-block';
        keyToggle.style.display = (toggle as any)['checked'] ? 'none' : 'flex';
    });


    const keySettings: HTMLElement = getElement('key-settings');
    getElement('close-key-settings').addEventListener('click', () => {
        keySettings.style.opacity = '0';
        keySettings.style.marginLeft = '0';
        keySettings.style.width = '0';
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
    function setSelectedKey(rowCol: string, slotNum: number) {
        if (slotNum < 0 || slotNum > 3) {
            console.log("Invalid key slot passed: " + slotNum)
            return
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

        getElement(`key-slot-${slotNum}`).style.borderColor = 'var(--accent-color)';

        // Reset old borders
        if (selectedKeySlot !== undefined) {
            getElement(`key-slot-${selectedKeySlot}`).style.borderColor = '';
        }

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
                keySettings.style.opacity = '1';
                keySettings.style.marginLeft = '50px';
                keySettings.style.width = '255px';

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
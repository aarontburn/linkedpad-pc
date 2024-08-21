(() => {
    const CHANNEL_NAME: string = ":3";

    function sendToProcess(eventType: string, ...data: any[]) {
        return window.ipc.send(CHANNEL_NAME, eventType, ...data);
    }

    function getElement(id: string): HTMLElement {
        const query: HTMLElement = document.getElementById(id);
        if (query === null) {
            console.log("Could not find element with ID: " + id);
        }
        return query;
    }

    window.ipc.on(CHANNEL_NAME, async (_, eventType: string, ...data: any[]) => {
        console.log(eventType)
        switch (eventType) {
            case 'wifi-change': {
                const status: number = data[0];
                const wifiStatus: HTMLElement = getElement('wifi-status');

                switch (status) {
                    case 0: {
                        wifiStatus.innerHTML = 'Connecting...';
                        wifiStatus.style.color = 'yellow';
                        break
                    }
                    case -1: {
                        wifiStatus.innerHTML = 'Disconnected';
                        wifiStatus.style.color = 'red';
                        break
                    }
                    case 1: {
                        wifiStatus.innerHTML = 'Connected';
                        wifiStatus.style.color = 'green';
                        break
                    }
                }

                break;
            }
        }
    });


    getElement('send-wifi').addEventListener('click', () => {
        const ssid: string = (getElement('wifi-ssid') as HTMLInputElement).value;
        const password: string = (getElement('wifi-password') as HTMLInputElement).value;

        sendToProcess('send-wifi', ssid, password);
    });

})()
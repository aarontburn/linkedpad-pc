(() => {
    function getElement(id: string): HTMLElement {
        const query: HTMLElement = document.getElementById(id);
        if (query === null) {
            console.log("Could not find element with ID: " + id);
        }
        return query;
    }

    const padTab: HTMLElement = getElement('pad-tab');
    const settingsTab: HTMLElement = getElement('settings-tab');

    getElement('pad-tab-button').addEventListener('click', () => {
        padTab.style.display = 'flex';
        settingsTab.style.display = 'none';
    });

    getElement('settings-tab-button').addEventListener('click', () => {
        padTab.style.display = 'none';
        settingsTab.style.display = 'flex';
    });










})();
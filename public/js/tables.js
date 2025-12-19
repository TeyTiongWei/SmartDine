const socket = io(); // Connect to the server

socket.on('statusUpdated', (data) => {
    console.log(`Server signaled update for tables: ${data.tables.join(',')}`);

    // Force a full page reload when the event is received
    window.location.reload();
})

socket.on('zoneStatusChange', (data) => {
    const action = data.status ? 'Activated' : 'Deactivated';
    console.log(`Server signaled appliance changes: ${action} zones: ${data.zones.join(',')}`);

    // Force a full page reload when the event is received
    window.location.reload();
})

function updateTime() {
    const now = new Date();

    const date = now.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
    });

    const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true
    }).toLowerCase();

    document.getElementById("currentTime").textContent = `${date}, ${time}`;
}

updateTime();

setInterval(updateTime, 60000);

async function toggleAppliance(event, btn, zone, name) {
    event.preventDefault();
    try {
        const response = await fetch('/toggleAppliance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone, name })
        });

        const data = await response.json();
        if (data.success) {
            btn.classList.toggle('btn-success');
            btn.classList.toggle('btn-secondary');
            btn.textContent = data.status ? 'ON' : 'OFF';
            updateZoneAllButton(zone);
        }
    } catch (error) {
        console.error('Error: ', error);
    }
}

async function toggleAllAppliances(event, btn, zone) {
    event.preventDefault();
    const allOn = btn.classList.contains('btn-success');
    const newStatus = !allOn;
    try {
        const response = await fetch('/toggleAllAppliances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone, allOn })
        });
        const data = await response.json();
        if (data.success) {
            document.querySelectorAll(`[data-zone="${zone}"][data-name]`).forEach(b => {
                b.classList.toggle('btn-success', newStatus);
                b.classList.toggle('btn-secondary', !newStatus);
                b.textContent = newStatus ? 'ON' : 'OFF';
            });
            btn.classList.toggle('btn-success');
            btn.classList.toggle('btn-secondary');
            btn.textContent = newStatus ? 'ALL ON' : 'ALL OFF';
        }
    } catch (error) {
        console.error('Error: ', error);
    }
}

function updateZoneAllButton(zone) {
    const btns = document.querySelectorAll(`[data-zone="${zone}"][data-name]`);
    const allBtn = document.querySelector(`[data-zone="${zone}"][data-all]`);
    const allOn = Array.from(btns).every(b => b.classList.contains('btn-success'));
    allBtn.classList.toggle('btn-success', allOn);
    allBtn.classList.toggle('btn-secondary', !allOn);
    allBtn.textContent = allOn ? 'ALL ON' : 'ALL OFF';
}
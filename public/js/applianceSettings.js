async function toggleUseCustom(event, btn, zone) {
    event.preventDefault();
    try {
        const response = await fetch('/toggleUseCustom', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ zone })
        });

        const data = await response.json();
        if (data.success) {
            btn.classList.toggle('btn-success');
            btn.classList.toggle('btn-secondary');
            btn.textContent = data.use_custom ? 'ON' : 'OFF';

            const settingsZone = document.getElementById(`settingsZone${zone}`);

            if (settingsZone) {
                if (data.use_custom) {
                    settingsZone.classList.remove('text-black-50');
                } else {
                    settingsZone.classList.add('text-black-50');
                }

                const inputs = settingsZone.querySelectorAll('input[type="number"]');
                inputs.forEach(input => {
                    input.disabled = !data.use_custom;
                });
            }
            console.log(`Zone ${zone} custom setting updated to: ${data.use_custom}`);
        }
    } catch (error) {
            console.error('Error toggling custom setting: ', error);
    }
}
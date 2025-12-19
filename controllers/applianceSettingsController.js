const pool = require("../database");

const renderApplianceSettingsPage = async (req, res) => {
    try {
        const applianceSettingsQuery = "SELECT * FROM appliance_settings ORDER BY zone";
        const applianceSettingsResult = await pool.query(applianceSettingsQuery);

        const settings = applianceSettingsResult.rows;

        const globalSettings = settings.find(s => s.zone === 'Global') || {activation_minutes: 15, shutdown_minutes: 60};

        const zoneSettings = settings.filter(s => s.zone !== 'Global');

        const zoneData = {};
        zoneSettings.forEach(current => {
            zoneData[current.zone] = {
                activation_minutes: current.activation_minutes,
                shutdown_minutes: current.shutdown_minutes,
                use_custom: current.use_custom
            };
        });

        res.render("applianceSettings", {globalSettings, zoneData});
    } catch (error) {
        console.error("Error loading appliance settings page: ", error);
    }
}

const toggleUseCustom = async (req, res) => {
    try {
        const { zone } = req.body;

        const getUseCustomQuery = "SELECT use_custom FROM appliance_settings WHERE zone = $1";
        const useCustomResult = await pool.query(getUseCustomQuery, [zone]);

        if (useCustomResult.rows.length === 0) {
            return res.status(404).json({ error: "Zone not found" });
        }

        const currentCustomSetting = useCustomResult.rows[0].use_custom;
        const newCustomSetting = !currentCustomSetting;

        const updateUseCustomQuery = "UPDATE appliance_settings SET use_custom = $1 WHERE zone = $2 RETURNING use_custom";
        const updateUseCustomResult = await pool.query(updateUseCustomQuery, [newCustomSetting, zone]);

        res.json({ success: true, use_custom: updateUseCustomResult.rows[0].use_custom });
    } catch (error) {
        console.error('Error toggling use custom: ', error);
        res.status(500).json({ error: "An error occured while toggling appliance" });
    }
}

const setGlobalSettings = async (req, res) => {
    try {
        const { defaultActivationTime, defaultShutdownTime } = req.body;
        const updateGlobalSettingsQuery = `
            UPDATE appliance_settings
            SET activation_minutes = $1, shutdown_minutes = $2
            WHERE zone = 'Global'`;

        await pool.query(updateGlobalSettingsQuery, [defaultActivationTime, defaultShutdownTime]);

        const updateZoneSettingsQuery = `
            UPDATE appliance_settings
            SET activation_minutes = $1, shutdown_minutes = $2
            WHERE zone != 'Global' AND use_custom = false`;

        await pool.query(updateZoneSettingsQuery, [defaultActivationTime, defaultShutdownTime]);
        return res.redirect("/applianceSettings");

    } catch (error) {
        console.error("Error setting global appliance settings: ", error);
        return res.redirect("/applianceSettings");
    }
}

const setZoneSettings = async (req, res) => {
    try {
        const zoneUpdates = {};

        for (const key in req.body) {
            let settingType = '';

            if (key.includes('activationTime')) {
                settingType = 'activation';
            } else if (key.includes('shutdownTime')) {
                settingType = 'shutdown';
            } else {
                continue; //Skip any other keys like submit buttons (if there are any)
            }

            const minuteValues = req.body[key];

            const zone = key.slice(-1);

            if (!zoneUpdates[zone]) {
                zoneUpdates[zone] = {};
            }

            const dbColumnName = `${settingType}_minutes`;

            zoneUpdates[zone][dbColumnName] = minuteValues;
        }

        for (const zone in zoneUpdates) {
            const updates = zoneUpdates[zone];
            const activationMinutes = updates.activation_minutes;
            const shutdownMinutes = updates.shutdown_minutes;

            if (activationMinutes && shutdownMinutes) {
                const updateZoneSpecificSettingsQuery = `
                    UPDATE appliance_settings
                    SET activation_minutes = $1, shutdown_minutes = $2
                    WHERE zone = $3 AND use_custom = true`;

                await pool.query(updateZoneSpecificSettingsQuery, [activationMinutes, shutdownMinutes, zone]);
            }
        }

        return res.redirect("/applianceSettings");
    } catch (error) {
        console.error("Error setting zone specific settings: ", error);
        return res.redirect("/applianceSettings");
    }
}

module.exports = { renderApplianceSettingsPage, toggleUseCustom, setGlobalSettings, setZoneSettings };
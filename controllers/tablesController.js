const pool = require("../database");

const renderTablesPage = async (req, res) => {
    try {
        const selectTablesQuery = "SELECT * FROM tables ORDER BY zone, id";
        const tablesResult = await pool.query(selectTablesQuery);

        // Group tables by zone
        const tablesByZone = {};
        tablesResult.rows.forEach(table => {
            if (!tablesByZone[table.zone]) {
                tablesByZone[table.zone] = [];
            }
            tablesByZone[table.zone].push(table);
        });

        const appliancesQuery = "SELECT * FROM appliances ORDER BY zone, id";
        const appliancesResult = await pool.query(appliancesQuery);

        // Group appliances by zone
        const appliancesByZone = {};
        appliancesResult.rows.forEach(appliance => {
            if (!appliancesByZone[appliance.zone]) {
                appliancesByZone[appliance.zone] = {};
            }
            appliancesByZone[appliance.zone][appliance.name] = appliance;
        })

        const zoneStatus = {};
        Object.entries(appliancesByZone).forEach(([zone, appliances]) => {
            const allOn = Object.values(appliances).every(app => app.status === true);
            zoneStatus[zone] = allOn;
        })

        res.render("tables", { tablesByZone, appliancesByZone, zoneStatus});
    } catch (error) {
        console.error("Error loading tables page:", error);
        req.flash("error", "An error occurred while loading tables");
        res.redirect("/tables");
    }
}

const toggleAppliance = async (req, res) => {
    try {
        const { zone, name } = req.body;

        // Get current status
        const getStatusQuery = "SELECT status FROM appliances WHERE zone = $1 AND name = $2";
        const statusResult = await pool.query(getStatusQuery, [zone, name]);

        if (statusResult.rows.length === 0) {
            return res.status(404).json({ error: "Appliance not found" });
        }

        const currentStatus = statusResult.rows[0].status;
        const newStatus = !currentStatus;

        // Update status
        const updateStatusQuery = "UPDATE appliances SET status = $1 WHERE zone = $2 AND name = $3 RETURNING status";
        const updateResult = await pool.query(updateStatusQuery, [newStatus, zone, name]);

        // Log the activity
        const activity = `${name} switched ${newStatus ? 'on' : 'off'}`;
        const logActivityQuery = "INSERT INTO appliance_activity_logs (zone, activity) VALUES ($1, $2)";
        await pool.query(logActivityQuery, [zone, activity]);

        res.json({ success: true, status: updateResult.rows[0].status });
    } catch (error) {
        console.error("Error toggling appliance: ", error);
        res.status(500).json({ error: "An error occured while toggling appliance" });
    }
}

const toggleAllAppliances = async (req, res) => {
    try {
        const { zone, allOn } = req.body;

        // Update all appliances in zone
        const newStatus = !allOn;
        const updateAllQuery = "UPDATE appliances SET status = $1 WHERE zone = $2 RETURNING *";
        const updateAllResult = await pool.query(updateAllQuery, [newStatus, zone]);

        // Log the activity
        const activity = `All appliances switched ${newStatus ? 'on' : 'off'}`;
        const logActivityQuery = "INSERT INTO appliance_activity_logs (zone, activity) VALUES ($1, $2)";
        await pool.query(logActivityQuery, [zone, activity]);

        res.json({ success: true, appliances: updateAllResult.rows});
    } catch (error) {
        console.error("Error toggling all appliances: ", error);
        res.status(500).json({ error: "An error occured while toggling all applainces" });
    }
}

module.exports = { renderTablesPage, toggleAppliance, toggleAllAppliances };
const pool = require("../database");

const renderDashboardPage = async (req, res) => {
    try {
        const todaysReservationsQuery = `
            SELECT COUNT(*) 
            FROM reservations 
            WHERE 
                reservation_date = CURRENT_DATE 
                AND status IN ('Scheduled', 'Ongoing')`;
        const todaysReservationsResult = await pool.query(todaysReservationsQuery);
        const todaysReservations = todaysReservationsResult.rows[0].count;

        const availableTablesQuery = "SELECT COUNT(*) FROM tables WHERE status = 'Available'";
        const availableTablesResult = await pool.query(availableTablesQuery);
        const availableTables = availableTablesResult.rows[0].count;

        const reservedTablesQuery = "SELECT COUNT(*) FROM tables WHERE status = 'Reserved'";
        const reservedTablesResult = await pool.query(reservedTablesQuery);
        const reservedTables = reservedTablesResult.rows[0].count;

        const occupiedTablesQuery = "SELECT COUNT(*) FROM tables WHERE status = 'Occupied'";
        const occupiedTablesResult = await pool.query(occupiedTablesQuery);
        const occupiedTables = occupiedTablesResult.rows[0].count;

        const upcomingReservationsQuery = `
            SELECT
                customer_name,
                TO_CHAR(reservation_time, 'HH:MI am') as reservation_time_formatted,
                party_size,
                table_number,
                status
            FROM reservations
            WHERE 
                reservation_date = CURRENT_DATE
                AND status IN ('Scheduled', 'Ongoing')
            ORDER BY 
                reservation_time ASC
            LIMIT 3`;
        const upcomingReservationsResult = await pool.query(upcomingReservationsQuery);
        const upcomingReservations = upcomingReservationsResult.rows;

        const applianceActivityQuery = `
            SELECT
                zone,
                activity,
                created_at,
                TO_CHAR(created_at, 'HH:MI am') as activity_time
            FROM appliance_activity_logs
            ORDER BY
                created_at DESC
            LIMIT 3`;
        const applianceActivityResult = await pool.query(applianceActivityQuery);
        const applianceActivity = applianceActivityResult.rows;

        res.render("dashboard", {
            todaysReservations, 
            availableTables, 
            reservedTables, 
            occupiedTables, 
            upcomingReservations,
            applianceActivity
        });
    } catch (error) {
        console.log("Error loading dashboard page: ", error);
    }
}

module.exports = { renderDashboardPage };
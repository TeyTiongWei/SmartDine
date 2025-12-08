const pool = require("../../database");
const cron = require("node-cron");

// Sets all past reservations to 'Completed'
async function updatePastReservations() {
    try {
        const updatePastReservationsQuery = `
            UPDATE reservations r
            SET status = 'Completed'
            FROM
                tables t,
                appliance_settings a
            WHERE
                r.status = 'Ongoing'
                AND r.table_number = t.table_number
                AND t.zone = a.zone
                AND (reservation_date + reservation_time + (a.shutdown_minutes * INTERVAL '1 minute')) < NOW()
            RETURNING r.table_number;
        `;

        const pastReservationsResult = await pool.query(updatePastReservationsQuery);
        if (pastReservationsResult.rowCount > 0) {
            const tableNumbers = pastReservationsResult.rows.map(row => row.table_number);
            const tableNumberList = tableNumbers.map(tn => `'${tn}'`).join(', ');

            const updateAvailableTablesQuery = `
                UPDATE tables
                SET status = 'Available'
                WHERE table_number IN (${tableNumberList})
                AND status = 'Occupied';
            `;

            const avaiableTablesResult = await pool.query(updateAvailableTablesQuery);

            console.log(`Scheduler updated ${pastReservationsResult.rowCount} past reservation(s) to 'Completed'.`);
            console.log(`${avaiableTablesResult.rowCount} table(s) updated to 'Available'.`);
        }
    } catch (error) {
        console.error("Error updating past reservations: ", error);
    }
}

async function updateCurrentReservations(io, now) {
    try {
        const updateReservationsQuery = `
            UPDATE reservations
            SET status = 'Ongoing'
            WHERE
                status = 'Scheduled'
                AND (reservation_date + reservation_time) <= NOW()
            RETURNING table_number;
        `;

        const reservationsResult = await pool.query(updateReservationsQuery);

        if(reservationsResult.rowCount > 0) {
            const tableNumbers = reservationsResult.rows.map(row => row.table_number);

            const tableNumberList = tableNumbers.map(tn => `'${tn}'`).join(', ');

            const updateTablesQuery = `
                UPDATE tables
                SET status = 'Occupied'
                WHERE table_number IN (${tableNumberList});
            `;

            const tablesResult = await pool.query(updateTablesQuery);

            // Emit a signal to all connected clients
            io.emit('statusUpdated', { tables: reservationsResult.rows.map(r => r.table_number) });

            console.log(`${reservationsResult.rowCount} reservations(s) updated to 'Ongoing'.`);
            console.log(`${tablesResult.rowCount} table(s) updated to 'Occupied' at ${now.toLocaleTimeString()}.`);
        }
    } catch (error) {
        console.error("Error updating current reservations: ", error);
    }
}

async function activateAppliancesAndFlagReservations(activationZoneList) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const checkReservationsQuery = `
            SELECT 
                r.id
            FROM
                reservations r
            JOIN
                tables t ON r.table_number = t.table_number
            JOIN
                appliance_settings s ON t.zone = s.zone
            WHERE
                t.zone IN (${activationZoneList})
                AND r.appliances_activated = false
                AND r.status IN ('Scheduled', 'Ongoing')
                AND (r.reservation_date + r.reservation_time - (s.activation_minutes * INTERVAL '1 minute')) <= NOW();
            `;

            const checkResult = await client.query(checkReservationsQuery);

            if (checkResult.rows.length > 0) {
                const updateReservationFlagQuery = `
                    UPDATE reservations r
                    SET appliances_activated = true
                    FROM
                        tables t
                    JOIN
                        appliance_settings s ON t.zone = s.zone
                    WHERE
                        r.table_number = t.table_number
                        AND t.zone IN (${activationZoneList})
                        AND r.appliances_activated = false
                        AND r.status IN ('Scheduled', 'Ongoing')
                        AND (r.reservation_date + r.reservation_time - (s.activation_minutes * INTERVAL '1 minute')) <= NOW();
                `;
                await client.query(updateReservationFlagQuery);

                const updateAppliancesStatusQuery = `
                    UPDATE appliances
                    SET status = true
                    WHERE zone IN (${activationZoneList});
                `;
                await client.query(updateAppliancesStatusQuery);

                console.log(`Successfully activated appliances for zones: ${activationZoneList}`);
            } else {
                console.log(`No pending unflagged reservations found. Skipping appliance status update for zones: ${activationZoneList}`);
            }

            await client.query('COMMIT');

    } catch (error) {
        await client.query('ROLLBACK'); //Rollback in case of any error
        console.error("Transaction failed during appliance activation: ", error)
        throw error;
    } finally {
        client.release();
    }
}

async function shutdownAppliancesInZones(activationZones) {
    const keepActiveList = activationZones.map(zone => `'${zone}'`).join(', ');

    try {
        const shutdownQuery = `
            UPDATE appliances
            SET status = false
            WHERE
                status = true
                AND zone NOT IN (${keepActiveList.length > 0 ? keepActiveList : "''"})
            RETURNING zone;
        `;

        const shutdownResult = await pool.query(shutdownQuery);

        if (shutdownResult.rowCount > 0) {
            const shutdownZones = shutdownResult.rows.map(row => row.zone);
            console.log(`Deactivated appliances in zones: ${shutdownZones.join(', ')}`);
            return shutdownZones;
        }
        return [];
    } catch (error) {
        console.error("Error shutting down appliances: ", error);
        return [];
    }
}

async function updateAppliances(io, now) {
    const nowTime = now.getTime(); 

    // 1. QUERY: Fetch Time Windows and Current Status 
    
    const timingQuery = `
        WITH RequiredTimings AS (
            -- 1. Get all relevant future reservations and their required timing windows
            SELECT
                t.zone,
                r.table_number,
                r.id,
                r.reservation_date + r.reservation_time - (s.activation_minutes * INTERVAL '1 minute') AS activation_time,
                r.reservation_date + r.reservation_time + (s.shutdown_minutes * INTERVAL '1 minute') AS shutdown_time
            FROM 
                reservations r
            JOIN 
                tables t ON r.table_number = t.table_number
            JOIN 
                appliance_settings s ON t.zone = s.zone
            WHERE
                r.status IN ('Scheduled', 'Ongoing') 
            AND
                (r.reservation_date + r.reservation_time + (s.shutdown_minutes * INTERVAL '1 minute')) > NOW()
            ORDER BY
                activation_time
        ),
        ZoneTimings AS (
            -- 2. Use a self-join to find the reservation that defines the boundary of the FIRST contiguous block
            SELECT
                R1.zone,
                R1.activation_time AS start_of_window,
                -- Find the maximum shutdown time (R2.shutdown_time) within the group
                MAX(R2.shutdown_time) AS latest_shutdown_in_group
            FROM 
                RequiredTimings R1
            JOIN 
                RequiredTimings R2 ON R1.zone = R2.zone
            WHERE
                -- Condition 1: R2's activation time must be less than or equal to R1's shutdown time. 
                -- This ensures R2 belongs to R1's contiguous block.
                R2.activation_time <= R1.shutdown_time
                -- Condition 2: R1 must be the earliest reservation overall (the start of the block)
                AND R1.activation_time = (SELECT MIN(activation_time) FROM RequiredTimings WHERE zone = R1.zone)
            GROUP BY
                R1.zone, 
                R1.activation_time
        )
        -- 3. Final Selection: Output the results
        SELECT
            zt.zone,
            zt.start_of_window AS earliest_activation_time,
            zt.latest_shutdown_in_group AS latest_shutdown_time,
            BOOL_OR(a.status) AS is_zone_active
        FROM 
            ZoneTimings zt
        JOIN
            appliances a ON zt.zone = a.zone 
        GROUP BY 
            zt.zone,
            zt.start_of_window,
            zt.latest_shutdown_in_group;
    `;

    const timingResult = await pool.query(timingQuery);
    
    const zoneTimings = timingResult.rows;

    // 2. DECIDE: Determine Activation and Shutdown Zones 

    const activationZones = [];

    zoneTimings.forEach(zt => {
        const earliestTime = zt.earliest_activation_time.getTime();
        const latestTime = zt.latest_shutdown_time.getTime();

        if (nowTime >= earliestTime && nowTime < latestTime) {
            activationZones.push(zt.zone);
        }
    });

    if (activationZones.length > 0) {
        const activationZoneList = activationZones.map(zone => `'${zone}'`).join(', ');
        await activateAppliancesAndFlagReservations(activationZoneList);
        io.emit('zoneStatusChange', { zones: activationZones, status: true });
    }

    const shutdownZones = await shutdownAppliancesInZones(activationZones);

    if (shutdownZones.length > 0) {
        io.emit('zoneStatusChange', { zones: shutdownZones, status: false });
    }
}

const checkAndToggleReservations = (io) => async() => {
    try {
        const now = new Date();
        console.log(`[CRON] Running check at ${new Date().toLocaleTimeString()}`);

        await updateCurrentReservations(io, now);

        await updateAppliances(io, now);

        await updatePastReservations();

    } catch (error) {
        console.error("Error running reservation scheduler: ", error);
    }
};

const startScheduler = (io) => {
    cron.schedule('* * * * *', checkAndToggleReservations(io));
    console.log("Reservation scheduler started. Checking every minute.");
};

module.exports = { startScheduler }
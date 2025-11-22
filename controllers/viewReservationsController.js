const pool = require("../database");

const renderViewReservationsPage = async (req, res) => {
    try {
        const today = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Fetch upcoming reservations (status: ongoing or scheduled)
        const upcomingQuery = `
            SELECT id, customer_name, reservation_date, reservation_time,
            party_size, table_number, status
            FROM reservations
            WHERE status IN ('Ongoing', 'Scheduled')
            ORDER BY reservation_date ASC, reservation_time ASC`;
        
        // Fetch past reservations (status: completed or cancelled)
        const pastQuery = `
            SELECT id, customer_name, reservation_date, reservation_time,
            party_size, table_number, status
            FROM reservations
            WHERE status IN ('Completed', 'Cancelled')
            ORDER BY id ASC`;

        const upcomingReservations = await pool.query(upcomingQuery);
        const pastReservations = await pool.query(pastQuery);

        const formatReservations = (reservations) => {
            return reservations.map(r => ({
                ...r,
                formatted_datetime: (() => {
                    const date = new Date(r.reservation_date);
                    const formattedDate = date.toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric'
                    });
                    const time = new Date(`2000-01-01T${r.reservation_time}`);
                    const formattedTime = time.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                    }).toLowerCase();
                    return `${formattedDate}, ${formattedTime}`;
                })()
            }));
        };

        res.render("viewReservations", { 
            today,
            upcomingReservations: formatReservations(upcomingReservations.rows),
            pastReservations: formatReservations(pastReservations.rows)
        });
    } catch (error) {
        console.error("Error loading reservations page:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/addReservations");
    }
}



module.exports = { renderViewReservationsPage };
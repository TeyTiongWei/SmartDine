const pool = require("../database");

const renderEditReservationPage = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch reservation details
        const query = `
            SELECT r.*, t.capacity 
            FROM reservations r
            JOIN tables t ON r.table_number = t.table_number
            WHERE r.id = $1`;
        
        const result = await pool.query(query, [id]);
        
        if (result.rows.length === 0) {
            req.flash("error", "Reservation not found");
            return res.redirect("/viewReservations");
        }

        const reservation = result.rows[0];

        if (reservation.reservation_date) {
            reservation.reservation_date = reservation.reservation_date.toISOString().split("T")[0];
        } else {
            reservation.reservation_date = "";
        }

        // Fetch tables for dropdown
        const tablesQuery = `
        SELECT *
        FROM tables
        WHERE     
        (status = 'Available' 
        OR table_number = (
            SELECT table_number 
            FROM reservations 
            WHERE id = $1
        ))
        AND capacity >= (
            SELECT party_size
            FROM reservations
            WHERE id = $1
        ) 
        ORDER BY id`;
        const tables = await pool.query(tablesQuery, [id]);

        res.render("editReservation", {
            reservation,
            tables: tables.rows
        });

    } catch (error) {
        console.error("Error loading edit page:", error);
        req.flash("error", "An error occurred while loading the reservation");
        res.redirect("/viewReservations");
    }
};

const updateReservation = async (req, res) => {
    try {
        const { id } = req.params;
        const { customerName, partySize, phoneNumber, tableNumber, 
                email, reservationDate, specialRequests, reservationTime } = req.body;

        const query = `
            UPDATE reservations 
            SET customer_name = $1, party_size = $2, phone_number = $3,
                table_number = $4, email = $5, reservation_date = $6,
                special_requests = $7, reservation_time = $8
            WHERE id = $9`;

        await pool.query(query, [
            customerName, partySize, phoneNumber, tableNumber,
            email, reservationDate, specialRequests, reservationTime, id
        ]);

        // req.flash("success", "Reservation updated successfully");
        res.redirect("/viewReservations");

    } catch (error) {
        console.error("Error updating reservation:", error);
        req.flash("error", "An error occurred while updating the reservation");
        res.redirect(`/editReservation/${req.params.id}`);
    }
};

const cancelReservation = async (req, res) => {
    console.log("Cancel reservation called");
    console.log("Request body:", req.body);
    res.redirect("/viewReservations");
}

module.exports = { renderEditReservationPage, updateReservation, cancelReservation };
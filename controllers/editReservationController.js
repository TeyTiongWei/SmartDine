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

        const getOldTableQuery = "SELECT table_number FROM reservations WHERE id = $1";
        const oldTableResult = await pool.query(getOldTableQuery, [id]);
        const oldTableNumber = oldTableResult.rows[0].table_number;

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

        if (oldTableNumber != tableNumber) {
            const updateOldTableQuery = "UPDATE tables SET status = 'Available' WHERE table_number = $1";
            await pool.query(updateOldTableQuery, [oldTableNumber]);

            const updateNewTableQuery = "UPDATE tables SET status = 'Reserved' WHERE table_number = $1";
            await pool.query(updateNewTableQuery, [tableNumber]);
        }

        req.flash("success", "Reservation Updated Successfully");
        res.redirect("/viewReservations");

    } catch (error) {
        console.error("Error updating reservation:", error);
        req.flash("error", "An error occurred while updating the reservation");
        res.redirect(`/editReservation/${req.params.id}`);
    }
};

const cancelReservation = async (req, res) => {
    try{
        const { id } = req.params;
        const { tableNumber } = req.body;

        const cancelReservationQuery = `
            UPDATE reservations
            SET status = 'Cancelled'
            WHERE id = $1`;
        await pool.query(cancelReservationQuery, [id]);

        const updateTableQuery = `
            UPDATE tables
            SET status = 'Available'
            WHERE table_number = $1`;
        await pool.query(updateTableQuery, [tableNumber]);

        req.flash("success", "Reservation Cancelled Successfully");
        res.redirect("/viewReservations");

    } catch (error) {
        console.error("Error cancelling reservation:", error);
        req.flash("error", "An error occurred while cancelling the reservation");
        res.redirect(`/editReservation/${req.params.id}`);
    }
};

const deleteReservation = async (req, res) => {
    try{
        const { id } = req.params;

        const deleteReservationQuery = "DELETE FROM reservations WHERE id = $1";
        await pool.query(deleteReservationQuery, [id]);

        req.flash("success", "Reservation Deleted Successfully");
        res.redirect("/viewReservations");

    } catch (error) {
        console.error("Error deleting reservation:", error);
        req.flash("error", "An error occurred while deleting the reservation");
        res.redirect("/viewReservations");
    }
};

module.exports = { renderEditReservationPage, updateReservation, cancelReservation, deleteReservation };
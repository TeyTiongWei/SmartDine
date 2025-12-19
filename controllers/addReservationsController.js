const pool = require("../database");

const renderAddReservationsPage = async (req, res) => {
    try {
        const tablesQuery = "SELECT table_number, capacity FROM tables WHERE status = 'Available' ORDER BY id";
        const tablesResult = await pool.query(tablesQuery);
        const tables = tablesResult.rows;

        res.render("addReservations", { tables, needsValidation: true });

    } catch (error) {
        console.error("Error loading reservation form:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/addReservations");
    }  
}

const addReservations = async (req, res) => {
    try {
        const {customerName, phoneNumber, email, specialRequests, partySize, tableNumber, reservationDate, reservationTime} = req.body;

        const phoneNumberRegex = /^\d{10}$/;
        if (!phoneNumberRegex.test(phoneNumber)) {
            req.flash("error", "Invalid phone number format. Please enter a 10-digit phone number.");
            return res.redirect("/addReservations");
        } 

        const checkPhoneNumberQuery = "SELECT * FROM reservations WHERE phone_number = $1";
        const existingPhoneNumber = await pool.query(checkPhoneNumberQuery, [phoneNumber]);

        if (existingPhoneNumber.rows.length > 0) {
            req.flash("error", "This phone number has already been used for a reservation.");
            return res.redirect("/addReservations");
        }

        const checkEmailQuery = "SELECT * FROM reservations WHERE email = $1";
        const existingEmail = await pool.query(checkEmailQuery, [email]);

        if (existingEmail.rows.length > 0) {
            req.flash("error", "This email has already been used for a reservation.");
            return res.redirect("/addReservations");
        }

        if (partySize < 1 || partySize > 8) {
            req.flash("error", "Party size must be between 1 and 8.");
            return res.redirect("/addReservations");
        }

        const checkTableAvailabilityQuery = "SELECT * FROM tables WHERE table_number = $1 AND status = 'Available'";
        const tableAvailabilityResult = await pool.query(checkTableAvailabilityQuery, [tableNumber]);

        if (tableAvailabilityResult.rows.length !== 0) {
            const checkTableFitQuery = "SELECT capacity FROM tables WHERE table_number = $1";
            const tableCapacityResult = await pool.query(checkTableFitQuery, [tableNumber]);
            const tableCapacity = tableCapacityResult.rows[0].capacity;
            if (partySize > tableCapacity) {
                req.flash("error", `Selected table can only accommodate up to ${tableCapacity} guests. Please choose a different table.`);
                return res.redirect("/addReservations");
            }
        } else {
            req.flash("error", "Selected table is not available. Please choose a different table.");
            return res.redirect("/addReservations");
        }

        const reservationDateObj = new Date(reservationDate);
        const today = new Date();

        // Reset time part to only compare dates
        today.setHours(0, 0, 0, 0);
        reservationDateObj.setHours(0, 0, 0, 0);

        if (reservationDateObj < today) {
            req.flash("error", "Reservation date cannot be in the past.");
            return res.redirect("/addReservations");
        }

        // If all is well, insert the reservation
        const insertReservationQuery = `
            INSERT INTO reservations 
            (customer_name, phone_number, email, special_requests, party_size, table_number, reservation_date, reservation_time) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        await pool.query(insertReservationQuery, [
            customerName, phoneNumber, email, specialRequests, partySize, tableNumber, reservationDate, reservationTime
        ]);

        const updateTableStatusQuery = "UPDATE tables SET status = 'Reserved' WHERE table_number = $1";
        await pool.query(updateTableStatusQuery, [tableNumber]);

        res.redirect("/viewReservations");

    } catch (error) {
        console.error("Error loading reservation form:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/addReservations");
    }

}

module.exports = {renderAddReservationsPage ,addReservations};
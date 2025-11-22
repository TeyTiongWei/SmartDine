const pool = require("../database");

const login = async(req, res) => {
    try {
        const {username, password} = req.body;
        loginQuery = "SELECT * FROM admins WHERE username = $1 AND password = $2";
        const admin = await pool.query(loginQuery, [username, password]);

        if (admin.rows.length === 0) { 
            // return res.status(401).json({message: "Invalid credentials"});   Version 1
            req.flash("error", "Incorrect username or password");
            return res.redirect("/login");
        }

        res.redirect("/addReservations");

    } catch (error) {
        console.error("Login error:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/login");
        // res.status(500).json({message: "Server error"});   Version 1
    }
}

module.exports = login;
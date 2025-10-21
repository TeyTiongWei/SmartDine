const pool = require("../database");

const register = async(req, res) => {
    try {
        const {username, email, password, confirmPassword} = req.body;

        if (password !== confirmPassword) {
            req.flash("error", "Passwords do not match");
            return res.redirect("/register");

        } else {
            const checkUsernameQuery = "SELECT * FROM admins WHERE username = $1";
            const existingUsername = await pool.query(checkUsernameQuery, [username]);

            if (existingUsername.rows.length > 0) {
                req.flash("error", "Username already taken");
                return res.redirect("/register");
            }

            const checkEmailQuery = "SELECT * FROM admins WHERE email = $1";
            const existingEmail = await pool.query(checkEmailQuery, [email]);

            if (existingEmail.rows.length > 0) {
                req.flash("error", "Email already registered");
                return res.redirect("/register");
            }

            const insertQuery = "INSERT INTO admins (username, email, password) VALUES ($1, $2, $3)";
            await pool.query(insertQuery, [username, email, password]);
            res.redirect("/dashboard"); // Maybe can add success flash before this
        }

    } catch (error) {
        console.error("Login error:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/login");
        // res.status(500).json({message: "Server error"});   Version 1
    }
}

module.exports = register;
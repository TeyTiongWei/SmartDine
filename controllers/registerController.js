const pool = require("../database");
const bcrypt = require('bcrypt');

const renderRegisterPage = (req, res) => {
    res.render("register", { layout: false });
}

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

            const hashedPassword = await bcrypt.hash(password, 10);
            const insertQuery = "INSERT INTO admins (username, email, password) VALUES ($1, $2, $3) RETURNING id";
            const newAdmin = await pool.query(insertQuery, [username, email, hashedPassword]);
            
            req.session.adminId = newAdmin.rows[0].id;

            res.redirect("/dashboard"); 
        }

    } catch (error) {
        console.error("Login error:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/login");
    }
}

module.exports = { renderRegisterPage, register };
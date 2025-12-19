const pool = require("../database");
const bcrypt = require('bcrypt');

const renderLoginPage = (req, res) => {
    res.render("login", { layout: false });
}

const login = async(req, res) => {
    try {
        const {username, password} = req.body;
        const loginQuery = "SELECT * FROM admins WHERE username = $1";
        const result = await pool.query(loginQuery, [username]);

        if (result.rows.length === 0) { 
            req.flash("error", "Incorrect username or password");
            return res.redirect("/login");
        }

        const admin = result.rows[0];
        const isPasswordMatch = await bcrypt.compare(password, admin.password);

        if (!isPasswordMatch) {
            req.flash("error", "Incorrect username or password");
            return res.redirect("/login");
        }

        // Set the session
        req.session.adminId = admin.id;

        res.redirect("/dashboard");

    } catch (error) {
        console.error("Login error:", error);
        req.flash("error", "An error has occured. Please try again.");
        res.redirect("/login");
    }
}

const logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            res.redirect("/dasboard");
        }
        res.redirect("/login");
    });
}

module.exports = { renderLoginPage, login, logout };
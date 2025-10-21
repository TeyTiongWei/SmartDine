const express = require("express");
const session = require('express-session');
const flash = require('connect-flash');
const path = require("path");
const pool = require("./database"); // Might not need this
const login = require('./controllers/loginController');
const register = require('./controllers/registerController');
const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret: 'keyboard cat', // Got this from npm express-session website
  resave: false,
  saveUninitialized: false
}));
app.use(flash());

app.use(express.static(path.join(__dirname, "public")));

// pool.connect()
//     .then(() => console.log("Connected to the database"))
//     .catch(err => console.error("Database connection error", err.stack));

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded

app.use((req, res, next) => {
    res.locals.error = req.flash("error");
    next();
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.post("/login", login);

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", register);

app.get("/sidebar", (req, res) => {
    res.render("sidebar");
})

app.listen(3000, () => {
    console.log("Server is running on port 3000");
})
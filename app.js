const express = require("express");
const http = require('http');
const socketIo = require('socket.io');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const path = require("path");
const pool = require("./database"); // Might not need this
const login = require('./controllers/loginController');
const register = require('./controllers/registerController');
const {renderAddReservationsPage, addReservations} = require('./controllers/addReservationsController');
const {renderViewReservationsPage} = require('./controllers/viewReservationsController');
const {renderEditReservationPage, updateReservation, cancelReservation} = require('./controllers/editReservationController');
const {renderTablesPage, toggleAppliance, toggleAllAppliances} = require('./controllers/tablesController');
const { startScheduler } = require('./public/js/scheduler');
const methodOverride = require('method-override');
const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Initialize Socket.IO

startScheduler(io);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set('layout extractScripts', true);
// app.set('layout extractStyles', true); Causes issue for contentFor('css') when uncommented
app.set('layout', './layouts/boilerplate');

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
app.use(methodOverride("_method"));

app.use((req, res, next) => {
    res.locals.error = req.flash("error");
    next();
})

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get("/login", (req, res) => {
    res.render("login", { layout: false });
})

app.post("/login", login);

app.get("/register", (req, res) => {
    res.render("register", { layout: false });
});

app.post("/register", register);

app.get("/addReservations", renderAddReservationsPage);

app.post("/addReservations", addReservations);

app.get("/viewReservations", renderViewReservationsPage);

app.get("/editReservation/:id", renderEditReservationPage);

app.post("/editReservation/:id", updateReservation);

app.patch("/editReservation/:id", cancelReservation);

app.get("/tables", renderTablesPage);

app.post("/toggleAppliance", toggleAppliance);

app.post("/toggleAllAppliances", toggleAllAppliances);

// startScheduler(io);

server.listen(3000, () => {
    console.log("Server is running on port 3000");
    // startScheduler();
})
const express = require("express");
const http = require('http');
const socketIo = require('socket.io');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const flash = require('connect-flash');
const path = require("path");
const {renderLoginPage, login, logout} = require('./controllers/loginController');
const {renderRegisterPage, register} = require('./controllers/registerController');
const {renderAddReservationsPage, addReservations} = require('./controllers/addReservationsController');
const {renderViewReservationsPage} = require('./controllers/viewReservationsController');
const {renderEditReservationPage, updateReservation, cancelReservation, deleteReservation} = require('./controllers/editReservationController');
const {renderTablesPage, toggleAppliance, toggleAllAppliances} = require('./controllers/tablesController');
const {renderApplianceSettingsPage, toggleUseCustom, setGlobalSettings, setZoneSettings} = require('./controllers/applianceSettingsController');
const {renderDashboardPage} = require('./controllers/dashboardController');
const { startScheduler } = require('./public/js/scheduler');
const { isLoggedIn, isNotLoggedIn } = require('./middleware');
const methodOverride = require('method-override');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//startScheduler(io); // TURN THIS BACK ON LATER

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

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use(methodOverride("_method"));

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
})

app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

app.get("/login", isNotLoggedIn, renderLoginPage);

app.post("/login", isNotLoggedIn, login);

app.post("/logout", isLoggedIn, logout);

app.get("/register", isNotLoggedIn, renderRegisterPage);

app.post("/register", isNotLoggedIn, register);

app.get("/addReservations", isLoggedIn, renderAddReservationsPage);

app.post("/addReservations", isLoggedIn, addReservations);

app.get("/viewReservations", isLoggedIn, renderViewReservationsPage);

app.get("/editReservation/:id", isLoggedIn, renderEditReservationPage);

app.post("/editReservation/:id", isLoggedIn, updateReservation);

app.patch("/editReservation/:id", isLoggedIn, cancelReservation);

app.delete("/editReservation/:id", isLoggedIn, deleteReservation);

app.get("/tables", isLoggedIn, renderTablesPage);

app.post("/toggleAppliance", isLoggedIn, toggleAppliance);

app.post("/toggleAllAppliances", isLoggedIn, toggleAllAppliances);

app.get("/applianceSettings", isLoggedIn, renderApplianceSettingsPage);

app.post("/toggleUseCustom", isLoggedIn, toggleUseCustom);

app.post("/applianceSettingsGlobal", isLoggedIn, setGlobalSettings);

app.post("/applianceSettingsZone", isLoggedIn, setZoneSettings);

app.get("/dashboard", isLoggedIn, renderDashboardPage);

server.listen(3000, () => {
    console.log("Server is running on port 3000");
    // startScheduler();
})
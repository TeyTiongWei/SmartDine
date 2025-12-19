const isLoggedIn = (req, res, next) => {
    if (req.session.adminId) {
        return next();
    }
    res.redirect("/login");
}

const isNotLoggedIn = (req, res, next) => {
    if (!req.session.adminId) {
        return next();
    }
    res.redirect("/dashboard");
}

module.exports = { isLoggedIn, isNotLoggedIn };
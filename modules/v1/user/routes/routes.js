const User = require("../controller/User");
const middleware = require("../../../../middlewares/data-validation");

const user = (app) =>{
    app.post("/v1/user/signup", User.signup);

    app.post("/v1/user/login", User.login);
    app.post("/v1/user/logout");
}

module.exports = user;
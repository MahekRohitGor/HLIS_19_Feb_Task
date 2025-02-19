const express = require("express");
const app = express();
const path = require("path");
const common = require("./utilities/common");
const constant = require("./config/constants");
const app_routing = require("./modules/app-routing");

require('dotenv').config();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app_routing.v1(app);

app.listen(process.env.PORT | 5000, () => {
    console.log(`Server started on: http://localhost:${process.env.PORT}`);
});
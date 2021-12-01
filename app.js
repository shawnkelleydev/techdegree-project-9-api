"use strict";

// load modules
const express = require("express");
const morgan = require("morgan");
const sequelize = require("./models").sequelize;
const User = require("./models").User;

const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);

// variable to enable global error logging
const enableGlobalErrorLogging =
  process.env.ENABLE_GLOBAL_ERROR_LOGGING === "true";

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan("dev"));

//json!
app.use(express.json());

(async () => {
  try {
    await sequelize.sync();
  } catch (err) {
    console.error("Man down in Sync Function! ", err);
  }
})();

// db connection tester
// (async function () {
//   try {
//     await sequelize.authenticate();
//     console.log("Success!");
//   } catch (err) {
//     console.error("Man down! ", err);
//   }
// })();

// ROUTES ---------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the REST API project!",
  });
});

app.get("/api/users", async (req, res) => {
  try {
    const users = await User.findAll();
    console.log(users);
    res.json({ users });
    res.status(200);
  } catch (err) {
    console.error("Man down! ", err);
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const body = await req.body;
    const hash = bcrypt.hashSync(body.password, salt);
    res.json(hash);
    res.status(201);
  } catch (err) {
    console.error("Man down! ", err);
  }
  //need Location header set to "/"
});

app.get("/api/courses", (req, res) => {
  res.json({ message: "courses GET" });
  res.status(200);
});

app.post("/api/courses", (req, res) => {
  res.json({ message: "courses POST" });
  res.status(201);
});

app.get("/api/courses/:id", (req, res) => {
  res.json({ message: "courses/:id GET" });
  res.status(200);
});

app.put("/api/courses/:id", (req, res) => {
  res.json({ message: "courses/:id PUT" });
  res.status(204);
});

app.delete("/api/courses/:id", (req, res) => {
  res.json({ message: "courses/:id DELETE" });
  res.status(204);
});

// END ROUTES ---------------------------------------

// ERRORS

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: "Route Not Found",
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(`Global error handler: ${JSON.stringify(err.stack)}`);
  }

  res.status(err.status || 500).json({
    message: err.message,
    error: {},
  });
});

//SERVER

// set our port
app.set("port", process.env.PORT || 3000);

// start listening on our port
const server = app.listen(app.get("port"), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});

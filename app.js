"use strict";

// load modules
const express = require("express");
const morgan = require("morgan");
const sequelize = require("./models").sequelize;
const User = require("./models").User;
const Course = require("./models").Course;
const auth = require("basic-auth");

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

//sync db
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
//     console.log("Connection successful!");
//   } catch (err) {
//     console.error("Man down! DB connection problem:", err);
//   }
// })();

//authentication
const authenticateUser = async (req, res, next) => {
  const credentials = auth(req);
  let message;
  console.log(credentials);
  if (credentials) {
    const user = await User.findOne({
      where: { emailAddress: credentials.name },
    });

    if (user) {
      const authenticated = bcrypt.compare(credentials.pass, user.password);

      if (authenticated) {
        console.log(`Authentication successful for ${user.emailAddress}`);
        req.currentUser = user;
      } else {
        message = `Authentication failure for ${user.emailAddress}`;
      }
    } else {
      message = `User not found for ${user.emailAddress}`;
    }
  } else {
    message = "Auth header not found";
  }

  if (message) {
    console.warn(message);
    res.status(401).json({ message: "Access Denied" });
  } else {
    next();
  }
};

// ROUTES ---------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the REST API project!",
  });
});

app.get("/api/users", authenticateUser, async (req, res) => {
  try {
    const user = await req.currentUser;
    res.json({ user }).status(200);
  } catch (err) {
    console.error("Man down! ", err);
    res.status(400);
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const body = req.body;
    let hash;
    if (body.password !== "") {
      hash = bcrypt.hashSync(body.password, salt);
    } else {
      hash = null;
    }

    const newUser = {
      firstName: body.firstName,
      lastName: body.lastName,
      emailAddress: body.emailAddress,
      password: hash,
    };

    await User.create(newUser);
    res.set("Location", "/");
    res.send();
    res.status(201);
  } catch (err) {
    console.error("Man down! ", err);
    if (err.name.toLowerCase().includes("sequelize")) {
      const errors = err.errors.map((err) => err.message);
      res.status(400).json({ errors });
    }
  }
});

app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.findAll();
    res.json(courses);
    res.status(200);
  } catch (err) {
    console.log("Man down! ", err);
    res.send("Man down!", err).status(400);
  }
});

app.post("/api/courses", authenticateUser, async (req, res) => {
  try {
    const body = req.body;
    const newCourse = {
      title: body.title,
      description: body.description,
      estimatedTime: body.estimatedTime,
      materialsNeeded: body.materialsNeeded,
      userId: req.currentUser.id,
    };

    await Course.create(newCourse);
    const course = await Course.findOne({ where: { title: body.title } });
    res.set("Location", `/${course.id}`);
    res.send();
    res.status(201);
  } catch (err) {
    console.error("Man down! ", err);
    if (err.name.includes("Sequelize")) {
      const errors = err.errors.map((err) => err.message);
      res.status(400).json({ errors });
    }
  }
});

//
app.get("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findOne({ where: { id: req.params.id } });
    // const userId = course.userId;
    // let user = await User.findOne({ where: { id: userId } });
    // user = user.firstName + " " + user.lastName;
    if (course) {
      res.json({ course });
      res.status(200);
    } else {
      res.send("Course not found.");
      res.status(400);
    }
  } catch (err) {
    console.error("Man down! ", err);
    if (err.name.includes("Sequelize")) {
      const errors = err.errors.map((err) => err.message);
      res.status(400).json({ errors });
    }
  }
});

//handles updates
app.put("/api/courses/:id", authenticateUser, async (req, res) => {
  try {
    let courseOwner = await Course.findOne({ where: { id: req.params.id } });
    courseOwner = courseOwner.userId;
    const user = req.currentUser;
    //tests for user ownership
    if (courseOwner === user.id) {
      //handles update
      const data = req.body;
      const course = await Course.update(data, {
        where: { id: req.params.id },
      });

      if (course) {
        res.send();
        res.status(204);
      } else {
        res.send("Course not found.").status(400);
      }
    } else {
      res.send("Authentication failure.  No actions taken.");
      res.status(401);
    }
  } catch (err) {
    console.error("Man down! ", err);
    if (err.name.includes("Sequelize")) {
      const errors = err.errors.map((err) => err.message);
      res.status(400).json({ errors });
    }
  }
});

//handles deletions
app.delete("/api/courses/:id", authenticateUser, async (req, res) => {
  try {
    let courseOwner = await Course.findOne({ where: { id: req.params.id } });
    courseOwner = courseOwner.userId;
    const user = req.currentUser;
    if (user.id === courseOwner) {
      const course = await Course.destroy({ where: { id: req.params.id } });
      if (course) {
        res.send();
        res.status(204);
      } else {
        res.send("Course not found.").status(400);
      }
    } else {
      res.send("Authentication failure. No actions taken.");
      res.status(401);
    }
  } catch (err) {
    console.error("Man down! ", err);
    res.status(400).send("Oh no! ", err);
  }
});

// END ROUTES ---------------------------------------

// ERRORS

// send 404 if no other route matched
app.use((req, res) => {
  res.status(404).json({
    message: "Man down!  Route Not Found",
  });
});

// setup a global error handler
app.use((err, req, res, next) => {
  if (enableGlobalErrorLogging) {
    console.error(
      `Man down!  Global error handler: ${JSON.stringify(err.stack)}`
    );
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

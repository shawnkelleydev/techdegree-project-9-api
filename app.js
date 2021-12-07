"use strict";

// load modules
const express = require("express");
const morgan = require("morgan");
const sequelize = require("./models").sequelize;
const User = require("./models").User;
const Course = require("./models").Course;
const auth = require("basic-auth");
const cors = require("cors");
//handle encryption
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);

// variable to enable global error logging
const enableGlobalErrorLogging =
  process.env.ENABLE_GLOBAL_ERROR_LOGGING === "true";

// create the Express app
const app = express();

// setup morgan which gives us http request logging
app.use(morgan("dev"));

//cors support
app.use(cors());

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

(async function () {
  try {
    await sequelize.authenticate();
    console.log("Connection to database successful!");
  } catch (err) {
    console.error("Man down! DB connection problem:", err);
  }
})();

//authentication
const authenticateUser = async (req, res, next) => {
  const credentials = auth(req);
  console.log(credentials);
  let message;
  if (credentials.name !== "" && credentials.pass !== "") {
    const user = await User.findOne({
      where: { emailAddress: credentials.name },
    });

    if (user) {
      const authenticated = await bcrypt.compare(
        credentials.pass,
        user.password
      );
      if (authenticated) {
        console.log(`Authentication successful for ${user.emailAddress}`);
        req.currentUser = user;
      } else {
        message = `Authentication failure for ${user.emailAddress}`;
      }
    } else {
      message = `User not found.`;
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
    res.status(200).json({ user });
  } catch (err) {
    console.error("Man down! ", err);
    res.status(400);
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const body = req.body;
    let hash;

    //encrypt password if provided
    if (
      body.password !== "" &&
      body.password !== null &&
      body.password !== undefined
    ) {
      hash = bcrypt.hashSync(body.password, salt);
    } else {
      hash = null;
    }

    //store encrypted password
    const newUser = {
      firstName: body.firstName,
      lastName: body.lastName,
      emailAddress: body.emailAddress,
      password: hash,
    };

    //add user to database
    await User.create(newUser);
    res.set("Location", "/");
    res.status(201).send();
  } catch (err) {
    console.error("Man down! ", err);
    if (err.name.toLowerCase().includes("sequelize")) {
      //return validation errors
      const errors = err.errors.map((err) => err.message);
      res.status(400).json({ errors });
    }
  }
});

//shows all courses in database
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.findAll({
      include: [{ model: User, as: "user" }],
    });
    res.status(200).json(courses);
  } catch (err) {
    console.log("Man down! ", err);
    res.status(400).send("Man down!", err);
  }
});

//adds courses to database
app.post("/api/courses", authenticateUser, async (req, res) => {
  try {
    const body = req.body;

    const newCourse = {
      title: body.title,
      description: body.description,
      estimatedTime: body.estimatedTime,
      materialsNeeded: body.materialsNeeded,
      userId: req.currentUser.id, //adds current authenticated user to course data
    };

    await Course.create(newCourse);
    const course = await Course.findOne({ where: { title: body.title } });
    res.set("Location", `courses/${course.id}`);
    res.status(201).send();
  } catch (err) {
    console.error("Man down! ", err);
    if (err.name.includes("Sequelize")) {
      const errors = err.errors.map((err) => err.message);
      res.status(400).json({ errors });
    }
  }
});

//gets information about a specific course
app.get("/api/courses/:id", async (req, res) => {
  try {
    const course = await Course.findByPk(req.params.id, {
      include: {
        model: User,
        as: "user",
      },
    });
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
        res.status(204).send();
      } else {
        res.status(400).send("Course not found.");
      }
    } else {
      res.status(401).send("Authentication failure.  No actions taken.");
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
        res.status(204).send();
      } else {
        res.status(400).send("Course not found.");
      }
    } else {
      res.status(401).send("Authentication failure. No actions taken.");
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
app.set("port", process.env.PORT || 5000);

// start listening on our port
const server = app.listen(app.get("port"), () => {
  console.log(`Express server is listening on port ${server.address().port}`);
});

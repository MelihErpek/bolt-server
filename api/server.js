const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const {  OpenAI } = require("openai");
const Sessions = require("./Models/Sessions.js");
require('dotenv').config();
const port = 5000;
const app = express();
app.use(express.json());
app.use(cors()); // Cors policy

// Configures bodyParser middleware to handle large JSON and URL-encoded request bodies with increased limits.
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 100000000,
  })
);


// Defines a simple GET route that returns a JSON response to confirm the API is working.
app.get("/", async (req, res) => {
  res.json(process.env.URL);
});



// Starts the server on defined port and logs a message indicating that the server is running.
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

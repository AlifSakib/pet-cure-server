const express = require("express");
const cors = require("cors");

require("dotenv").config();
require("colors");
const app = expres();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    message: "Everything Ok!",
  });
});

app.lister(port, () => {
  console.log(`Server is running on ${port}`.bgBlack);
});

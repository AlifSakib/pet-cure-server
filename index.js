const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");

require("dotenv").config();
require("colors");

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
  res.json({
    message: "Everything Ok!",
  });
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.4mqdriq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function dbConnect() {
  try {
    await client.connect();
    console.log("Database Connection Success.... ".bgYellow);
  } catch (error) {
    console.log(error.name.bgRed, error.message.bgRed);
  }
}

dbConnect();

const AppointmentOptions = client
  .db("PetCure")
  .collection("AppointmentsOptions");

const Booking = client.db("PetCure").collection("bookings");

app.get("/appointmentOptions", async (req, res) => {
  const options = await AppointmentOptions.find().toArray();
  res.send(options);
});

app.post("/bookings", async (req, res) => {
  const booking = req.body;
  console.log(booking);
  const result = await Booking.insertOne(booking);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Server is running on ${port}... `.bgCyan);
});

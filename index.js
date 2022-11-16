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

// Use Aggregate to query multiple collection and then merge data
app.get("/appointmentOptions", async (req, res) => {
  const date = req.query.date;
  const options = await AppointmentOptions.find().toArray();
  const bookingQuery = { appointmentDate: date };
  const alreadyBooked = await Booking.find(bookingQuery).toArray();
  //code carefully :D
  options.forEach((option) => {
    const optionBooked = alreadyBooked.filter(
      (book) => book.treatment === option.name
    );
    const bookedSlots = optionBooked.map((book) => book.slot);
    const reaminingSlots = option.slots.filter(
      (slot) => !bookedSlots.includes(slot)
    );
    option.slots = reaminingSlots;
    // console.log(date, option.name, bookedSlots, reaminingSlots.length);
  });
  res.send(options);
});

app.get("/v2/appointmentOptions", async (req, res) => {
  const date = req.query.date;
  const options = await AppointmentOptions.aggregate([
    {
      $lookup: {
        from: "bookings",
        localField: "name",
        foreignField: "treatment",
        pipeline: [
          {
            $match: {
              $expr: {
                $eq: ["$appointmentDate", date],
              },
            },
          },
        ],
        as: "booked",
      },
    },
    {
      $project: {
        name: 1,
        slots: 1,
        booked: {
          $map: {
            input: "$booked",
            as: "book",
            in: "$book.slot",
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        slots: {
          $setDifference: ["$slots", "$booked"],
        },
      },
    },
  ]).toArray();
  res.send(options);
});

app.post("/bookings", async (req, res) => {
  const booking = req.body;
  const result = await Booking.insertOne(booking);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Server is running on ${port}... `.bgCyan);
});

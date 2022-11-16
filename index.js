const { MongoClient, ServerApiVersion } = require("mongodb");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

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
const Users = client.db("PetCure").collection("users");

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
  const query = {
    appointmentDate: booking.appointmentDate,
    email: booking.email,
    treatment: booking.treatment,
  };

  const alreadyBooked = await Booking.find(query).toArray();
  if (alreadyBooked.length) {
    const message = `You already have a booking on ${booking.appointmentDate}`;
    return res.send({ acknowledged: false, message });
  }
  const result = await Booking.insertOne(booking);
  res.send(result);
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  console.log(authHeader);
  if (!authHeader) {
    return res.status(401).send("Unauthorized");
  }
  const token = authHeader.split(" ")[1];
  console.log(token);
}

app.get("/bookings", verifyJWT, async (req, res) => {
  const email = req.query.email;
  console.log(email);
  const query = { email: email };
  const bookings = await Booking.find(query).toArray();
  res.send(bookings);
});

app.post("/users", async (req, res) => {
  const user = req.body;
  const result = await Users.insertOne(user);
  res.send(result);
});

app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await Users.findOne(query);
  if (user) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN);
    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "" });
});

app.listen(port, () => {
  console.log(`Server is running on ${port}... `.bgCyan);
});

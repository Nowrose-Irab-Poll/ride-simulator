const express = require("express");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");

const app = express();
require("dotenv").config();

const port = process.env.PORT || 3000;
const { Pool } = require("pg");
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// Register rider
app.post("/riders/create", async (req, res) => {
  const { name, phone, email } = req.body;

  // Validate email and phone
  if (!validateEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  if (!validatePhone(phone)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  // Insert rider into database
  try {
    const client = await pool.connect();
    const query =
      "INSERT INTO Riders (name, phone, email) VALUES ($1, $2, $3) RETURNING *";
    const values = [name, phone, email];
    const result = await client.query(query, values);
    client.release();

    const response = result.rows[0];
    response.type = "rider";
    res.status(201).json(response);
  } catch (error) {
    // Check if error is due to unique violation (duplicate phone number)
    console.error("Error inserting rider:", error);
    const reply = handleErrorResponse(error);
    if (reply) {
      const { status, message } = reply;
      return res.status(status).json({ message });
    } else {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
});

// Register driver
app.post("/drivers/create", async (req, res) => {
  const { name, phone } = req.body;

  // Validate phone
  if (!validatePhone(phone)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  // Insert driver into database
  try {
    const client = await pool.connect();
    const query =
      "INSERT INTO Drivers (name, phone) VALUES ($1, $2) RETURNING *";
    const values = [name, phone];
    const result = await client.query(query, values);
    client.release();

    const response = result.rows[0];
    response.type = "driver";
    res.status(201).json(response);
  } catch (error) {
    // Check if error is due to unique violation (duplicate phone number)
    console.error("Error inserting rider:", error);
    const reply = handleErrorResponse(error);
    if (reply) {
      const { status, message } = reply;
      return res.status(status).json({ message });
    } else {
      return res.status(500).json({ message: "Internal server error" });
    }
  }
});

// Driver login
app.post("/drivers/login", async (req, res) => {
  const { phone } = req.body;

  // Generate OTP
  const otp = generateOTP();

  // In a real application, we would send this OTP to the driver's phone number via SMS
  console.log(`OTP for ${phone}: ${otp}`);

  otpMap.set(phone, otp);
  res.status(200).json({ message: "OTP sent successfully" });
});

// Verify OTP and generate JWT token API endpoint
app.post("/drivers/verify", (req, res) => {
  const { phone, otp } = req.body;

  // Check if OTP is valid
  if (otpMap.has(phone) && otpMap.get(phone) == otp) {
    const token = jwt.sign({ phone }, process.env.SECRET_KEY, {
      expiresIn: "1h",
    });

    otpMap.delete(phone);

    res.status(200).json({ token });
  } else {
    // Invalid OTP
    res.status(400).json({ message: "Invalid OTP" });
  }
});

const handleErrorResponse = (error) => {
  if (error.code === "23505") {
    if (error.constraint === "phone") {
      return { message: "Phone number already registered", status: 409 };
    }
    if (error.constraint === "email") {
      return { message: "Email already registered", status: 409 };
    }
  }

  return false;
};

app.get("/", (req, res) => {
  response.json({ info: "Ride Simulator API" });
});

app.listen(port, () => {
  console.log(`App running on port ${port}.`);
});

/*
 Utils
*/

// Validate email function
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate phone function
const validatePhone = (phone) => {
  if (phone.length != 11) return false;
  if (!phone.startsWith("01")) return false;
  return true; // Placeholder for demonstration
};

// Dummy data for driver OTP verification
const otpMap = new Map();
const generateOTP = (phone) => {
  // will be generating otp from any other API
  return "123456";
};

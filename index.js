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

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers?.token;
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.driverPhone = decoded.phone;
    req.driverId = decoded.driver_id;
    next();
  } catch (error) {
    res.status(400).json({ message: "Invalid token" });
  }
};

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
    // Check if error is due to unique violation
    if (error.code === "23505" && error.constraint === "phone") {
      return res
        .status(409)
        .json({ message: "Phone number already registered" });
    } else if (error.code === "23505" && error.constraint === "email") {
      return res.status(409).json({ message: "Email already registered" });
    } else {
      console.error("Error inserting rider:", error);
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
    // Check if error is due to unique violation
    if (error.code === "23505" && error.constraint === "drivers_phone_key") {
      return res
        .status(409)
        .json({ message: "Phone number already registered" });
    } else {
      console.error("Error inserting rider:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
});

// Driver login
app.post("/drivers/login", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      res.status(400).json({ message: "Phone not found" });
      return;
    }

    // Check if driver exists in the database
    const client = await pool.connect();
    const result = await client.query(
      "SELECT * FROM Drivers WHERE phone = $1",
      [phone]
    );
    const driverEntity = result.rows[0];
    client.release();

    if (!driverEntity) {
      res.status(401).json({ message: "Driver not registered" });
      return;
    }

    const otp = generateOTP();

    // In a real application, we would send this OTP to the driver's phone number via SMS
    console.log(`OTP for ${phone}: ${otp}`);

    otpMap.set(phone, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Verify OTP
app.post("/drivers/verify", async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Check if OTP is valid
    if (phone && otp && otpMap.has(phone) && otpMap.get(phone) == otp) {
      // Check if driver exists in the database

      const client = await pool.connect();
      const result = await client.query(
        "SELECT * FROM Drivers WHERE phone = $1",
        [phone]
      );
      client.release();

      if (result.rows.length > 0) {
        const driverEntity = result.rows[0];
        // Driver exists, generate JWT token
        const token = jwt.sign(driverEntity, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });

        otpMap.delete(phone);

        res.status(200).json({ token });
      } else {
        // Driver not found in the database
        res.status(404).json({ message: "Driver not found" });
      }
    } else {
      // Invalid OTP
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update driver location
app.post("/drivers/location", verifyToken, (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    const { driverPhone, driverId } = req;
    console.log("Location Ping:", {
      latitude,
      longitude,
      driverPhone,
      driverId,
    });

    res.status(200).json({ status: "Location updated" });
  } catch (e) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

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
  return "123456"; // default otp

  //   return Math.floor(100000 + Math.random() * 900000);
};

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const path = require("path");
const db = require("./config/db");

// ===============================
// ROUTES
// ===============================

const authRoutes = require("./routes/authRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const projectRoutes = require("./routes/projectRoutes");
const skillRoutes = require("./routes/skillRoutes");
const experienceRoutes = require("./routes/experienceRoutes");
const profileRoutes = require("./routes/profileRoutes");
const messageRoutes = require("./routes/messageRoutes");
const visitorRoutes = require("./routes/visitorRoutes");
const javaResourcesRoutes = require("./routes/javaResourcesRoutes");

// ===============================
// DEBUG ROUTES
// ===============================

console.log("authRoutes:", typeof authRoutes);
console.log("dashboardRoutes:", typeof dashboardRoutes);
console.log("projectRoutes:", typeof projectRoutes);
console.log("skillRoutes:", typeof skillRoutes);
console.log("experienceRoutes:", typeof experienceRoutes);
console.log("profileRoutes:", typeof profileRoutes);
console.log("messageRoutes:", typeof messageRoutes);
console.log("visitorRoutes:", typeof visitorRoutes);

// ===============================
// CREATE APP
// ===============================

const app = express();

// ===============================
// MIDDLEWARE
// ===============================

app.use(
    cors({
        origin: process.env.FRONTEND_URL,
        credentials: true,
    })
);

app.use(express.json());

app.use(
    express.urlencoded({
        extended: true
    })
);

// ===============================
// STATIC UPLOADED FILES
// ===============================

app.use(
    "/uploads",
    express.static(
        path.join(__dirname, "uploads")
    )
);

// ===============================
// AUTH ROUTES
// ===============================

app.use(
    "/api/auth",
    authRoutes
);

// ===============================
// ADMIN DASHBOARD
// ===============================

app.use(
    "/api/admin/dashboard",
    dashboardRoutes
);

// ===============================
// PROJECT ROUTES
// ===============================

app.use(
    "/api/projects",
    projectRoutes
);

// ===============================
// SKILLS
// ===============================

app.use(
    "/api/skills",
    skillRoutes
);

// ===============================
// EXPERIENCE
// ===============================

app.use(
    "/api/experience",
    experienceRoutes
);

// ===============================
// PROFILE
// ===============================

app.use(
    "/api/profile",
    profileRoutes
);

// ===============================
// MESSAGES
// ===============================

app.use(
    "/api/messages",
    messageRoutes
);

// ===============================
// VISITORS
// ===============================

app.use(
    "/api/visitors",
    visitorRoutes
);

app.use("/java-resources", javaResourcesRoutes);

// ===============================
// RESUME
// ===============================

app.use(
    "/resume",
    express.static(
        path.join(
            __dirname,
            "uploads",
            "resume"
        )
    )
);

// ===============================
// HOME API
// ===============================

app.get("/", (req, res) => {

    res.json({
        success: true,
        message: "Harshad Portfolio Backend API is running"
    });

});

// ===============================
// DATABASE TEST
// ===============================

app.get("/api/test-db", async (req, res) => {

    try {

        const [rows] = await db.query(
            "SELECT 1 AS result"
        );

        res.json({
            success: true,
            message: "Database connected successfully",
            data: rows
        });

    } catch (error) {

        console.error(
            "Database Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });

    }

});

// ===============================
// DATABASE INFO - TEMPORARY DEBUG
// ===============================
app.get("/api/db-info", async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT
                DATABASE() AS database_name,
                @@hostname AS mysql_hostname
        `);

        res.json({
            success: true,
            database: rows[0].database_name,
            hostname: rows[0].mysql_hostname
        });

    } catch (error) {
        console.error("DB Info Error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to get database information"
        });
    }
});

// ===============================
// 404 HANDLER
// ===============================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });

});

// ===============================
// GLOBAL ERROR HANDLER
// ===============================

app.use((err, req, res, next) => {

    console.error(
        "Global Server Error:",
        err
    );

    res.status(500).json({
        success: false,
        message: "Internal server error"
    });

});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {

    console.log(
        `Server running on http://localhost:${PORT}`
    );

});

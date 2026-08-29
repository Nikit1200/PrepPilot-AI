const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors")

const app = express();

app.use(express.json());
app.use(cookieParser());
const allowedOrigins = new Set([
    "http://localhost:5173",
    "https://careermateai-frontend.onrender.com"
]);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) return callback(null, true);
        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true
}));

const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

app.use("/api/auth",authRouter)
app.use("/api/interview", interviewRouter)

app.get("/", (req, res) => {
    res.json({
        message: "CareerMateAI Backend is running 🚀"
    });
});

module.exports = app;

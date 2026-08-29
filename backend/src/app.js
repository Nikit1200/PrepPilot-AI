const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cookieParser());

const allowedOrigins = new Set([
    "http://localhost:5173",
    "http://localhost:3000",
    "https://preppilot-ai-1-mxu6.onrender.com",
    "https://preppilot-ai-yumq.onrender.com"
]);

const corsOptions = {
    origin(origin, callback) {
        if (!origin || allowedOrigins.has(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Cookie"],
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

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

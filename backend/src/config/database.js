const mongoose = require("mongoose");

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);

        console.log("Connected to Database");
    } catch (error) {
        console.log("Database connection error:", error);
    }
}

module.exports = connectToDB;

require("dotenv").config();
const app = require("./src/app");
const mongoose = require("mongoose");


// ======================================================
// PORT
// ======================================================

const PORT = process.env.PORT || 3000;


// ======================================================
// START SERVER
// ======================================================

async function startServer() {

    try {

        await mongoose.connect(
            process.env.MONGODB_URI
        );

        console.log(
            "MongoDB connected successfully"
        );


        app.listen(PORT, "0.0.0.0", () => {

            console.log(
                `Server running on port ${PORT}`
            );

        });

    } catch (error) {

        console.error(
            "MongoDB connection error:",
            error
        );

        process.exit(1);

    }

}


// ======================================================
// START
// ======================================================

startServer();

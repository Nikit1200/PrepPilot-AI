const express = require("express");

const authMiddleware =
    require("../middlewares/auth.middleware");

const interviewController =
    require("../controllers/interview.controller");

const upload =
    require("../middlewares/file.middleware");


const interviewRouter =
    express.Router();


// ======================================================
// GENERATE INTERVIEW REPORT
// ======================================================

interviewRouter.post(
    "/",
    authMiddleware.authUser,
    upload.single("resume"),
    interviewController.generateInterViewReportController
);


// ======================================================
// GET REPORT BY ID
// ======================================================

interviewRouter.get(
    "/report/:interviewId",
    authMiddleware.authUser,
    interviewController.getInterviewReportByIdController
);


// ======================================================
// GET ALL REPORTS
// ======================================================

interviewRouter.get(
    "/",
    authMiddleware.authUser,
    interviewController.getAllInterviewReportController
);


// ======================================================
// GENERATE RESUME PDF
// ======================================================

interviewRouter.post(
    "/resume/pdf/:interviewReportId",
    authMiddleware.authUser,
    interviewController.generateResumePdfController
);


module.exports = interviewRouter;

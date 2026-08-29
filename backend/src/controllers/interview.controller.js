const pdfParse = require("pdf-parse");

const {
    generateInterviewReport,
    generateResumePdf
} = require("../services/ai.service");

const interviewReportModel =
    require("../models/interviewReport.model");
const { toServiceError } = require("../utils/serviceError");


// ======================================================
// GENERATE INTERVIEW REPORT
// ======================================================

async function generateInterViewReportController(req, res) {

    try {

        let resume = "";


        // ==================================================
        // PARSE RESUME PDF
        // ==================================================

        if (req.file) {

            console.log(
                "Resume file received"
            );


            const parser =
                new pdfParse.PDFParse({
                    data: req.file.buffer
                });


            const resumeContent =
                await parser.getText();


            await parser.destroy();


            resume =
                resumeContent.text || "";


            console.log(
                "Resume parsed successfully"
            );

        }


        // ==================================================
        // GET REQUEST DATA
        // ==================================================

        const {
            selfDescription,
            jobDescription
        } = req.body;


        // ==================================================
        // VALIDATE JOB DESCRIPTION
        // ==================================================

        if (!jobDescription?.trim()) {

            return res.status(400).json({

                message:
                    "Job description is required."

            });

        }


        // ==================================================
        // GENERATE AI REPORT
        // ==================================================

        console.log(
            "Generating interview report..."
        );


        const interViewReportByAi =
            await generateInterviewReport({

                resume,

                selfDescription,

                jobDescription

            });


        // ==================================================
        // SAVE REPORT
        // ==================================================

        const interviewReport =
            await interviewReportModel.create({

                user: req.user.id,

                resume,

                selfDescription,

                jobDescription,

                matchScore:
                    interViewReportByAi.matchScore,

                technicalQuestions:
                    interViewReportByAi.technicalQuestions,

                behavioralQuestions:
                    interViewReportByAi.behavioralQuestions,

                skillGaps:
                    interViewReportByAi.skillGaps,

                preparationPlan:
                    interViewReportByAi.preparationPlan,

                title:
                    interViewReportByAi.title

            });


        // ==================================================
        // RESPONSE
        // ==================================================

        return res.status(201).json({

            message:
                "Interview report generated successfully.",

            interviewReport

        });


    } catch (error) {

        console.error(
            "Generate Interview Report Controller Error:",
            error
        );


        const serviceError = toServiceError(error, "Failed to generate interview report.");
        return res.status(serviceError.status).json({ message: serviceError.message });

    }

}


// ======================================================
// GET REPORT BY ID
// ======================================================

async function getInterviewReportByIdController(
    req,
    res
) {

    try {

        const {
            interviewId
        } = req.params;


        const interviewReport =
            await interviewReportModel.findOne({

                _id: interviewId,

                user: req.user.id

            });


        if (!interviewReport) {

            return res.status(404).json({

                message:
                    "Interview report not found."

            });

        }


        return res.status(200).json({

            message:
                "Interview report fetched successfully.",

            interviewReport

        });


    } catch (error) {

        console.error(
            "Get Interview Report Error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to fetch interview report."

        });

    }

}


// ======================================================
// GET ALL REPORTS
// ======================================================

async function getAllInterviewReportController(
    req,
    res
) {

    try {

        const interviewReports =
            await interviewReportModel
                .find({
                    user: req.user.id
                })
                .sort({
                    createdAt: -1
                })
                .select(
                    "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan"
                );


        return res.status(200).json({

            message:
                "Interview reports fetched successfully.",

            interviewReports

        });


    } catch (error) {

        console.error(
            "Get All Interview Reports Error:",
            error
        );


        return res.status(500).json({

            message:
                "Failed to fetch interview reports."

        });

    }

}


// ======================================================
// GENERATE RESUME PDF
// ======================================================

async function generateResumePdfController(
    req,
    res
) {

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "RESUME PDF REQUEST"
        );

        console.log(
            "=========================================="
        );


        // ==================================================
        // GET ID
        // ==================================================

        const {
            interviewReportId
        } = req.params;


        console.log(
            "Interview Report ID:",
            interviewReportId
        );


        console.log(
            "User ID:",
            req.user.id
        );


        // ==================================================
        // FIND REPORT
        // ==================================================

        const interviewReport =
            await interviewReportModel.findOne({

                _id: interviewReportId,

                user: req.user.id

            });


        if (!interviewReport) {

            console.log(
                "Interview report not found"
            );


            return res.status(404).json({

                message:
                    "Interview report not found."

            });

        }


        console.log(
            "Interview report found"
        );


        // ==================================================
        // GENERATE PDF
        // ==================================================

        console.log(
            "Calling generateResumePdf..."
        );


        const pdfBuffer =
            await generateResumePdf({

                resume:
                    interviewReport.resume,

                selfDescription:
                    interviewReport.selfDescription,

                jobDescription:
                    interviewReport.jobDescription

            });


        console.log(
            "PDF generation completed"
        );


        console.log(
            "PDF size:",
            pdfBuffer.length,
            "bytes"
        );


        // ==================================================
        // SET RESPONSE HEADERS
        // ==================================================

        res.set({

            "Content-Type":
                "application/pdf",

            "Content-Disposition":
                `attachment; filename="resume_${interviewReportId}.pdf"`,

            "Content-Length":
                pdfBuffer.length

        });


        // ==================================================
        // SEND PDF
        // ==================================================

        return res.send(pdfBuffer);


    } catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "GENERATE RESUME PDF CONTROLLER ERROR"
        );

        console.error(
            "=========================================="
        );

        console.error(error);


        const serviceError = toServiceError(error, "Failed to generate resume PDF.");
        return res.status(serviceError.status).json({ message: serviceError.message });

    }

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    generateInterViewReportController,

    getInterviewReportByIdController,

    getAllInterviewReportController,

    generateResumePdfController

};

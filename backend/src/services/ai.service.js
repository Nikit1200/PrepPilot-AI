const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const fs = require("fs");
const path = require("path");

const puppeteer = require("puppeteer-core");
// @sparticuz/chromium is ESM. In CommonJS, Node exposes its default export here.
const chromiumModule = require("@sparticuz/chromium");
const chromium = chromiumModule.default || chromiumModule;
const { ServiceError, toServiceError } = require("../utils/serviceError");


// ======================================================
// GOOGLE GEMINI AI
// ======================================================

const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
});

function makePdfSafeHtml(html) {
    const cleaned = html
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<base\b[^>]*>/gi, "")
        .replace(/\son\w+\s*=\s*(["']).*?\1/gi, "")
        .replace(/\s(?:src|href)\s*=\s*(["'])https?:\/\/.*?\1/gi, "")
        .replace(/@import\s+(?:url\()?[^;]+;?/gi, "")
        .replace(/url\(\s*['"]?https?:[^)]*\)/gi, "");

    return /<html[\s>]/i.test(cleaned)
        ? cleaned
        : `<!doctype html><html><head><meta charset="utf-8"></head><body>${cleaned}</body></html>`;
}

async function generateResumeContent(prompt, responseSchema) {
    const models = [
        process.env.GEMINI_MODEL || "gemini-3.6-flash",
        // Keep a current stable fallback when an explicitly configured model is
        // retired or unavailable.
        "gemini-flash-latest"
    ].filter((model, index, availableModels) => availableModels.indexOf(model) === index);

    for (let index = 0; index < models.length; index += 1) {
        try {
            return await ai.models.generateContent({
                model: models[index],
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema
                }
            });
        } catch (error) {
            const isTemporaryFailure =
                Number(error?.status || error?.code || error?.response?.status) === 503 ||
                /UNAVAILABLE|high demand|temporarily unavailable/i.test(error?.message || "");

            if (!isTemporaryFailure || index === models.length - 1) {
                throw error;
            }

            console.warn(`Gemini model ${models[index]} is unavailable; trying ${models[index + 1]}.`);
        }
    }
}

function findLocalBrowserExecutable() {
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    if (process.platform !== "win32") return null;

    const programDirectories = [
        process.env.ProgramW6432,
        process.env.ProgramFiles,
        process.env["ProgramFiles(x86)"]
    ].filter(Boolean);

    const browserPaths = programDirectories.flatMap((directory) => [
        path.join(directory, "Google", "Chrome", "Application", "chrome.exe"),
        path.join(directory, "Microsoft", "Edge", "Application", "msedge.exe")
    ]);

    return browserPaths.find((browserPath) => fs.existsSync(browserPath)) || null;
}


// ======================================================
// INTERVIEW REPORT SCHEMA
// ======================================================

const interviewReportSchema = z.object({

    matchScore: z.number()
        .describe(
            "A score between 0 and 100 indicating how well the candidate's profile matches the job description"
        ),

    technicalQuestions: z.array(
        z.object({

            question: z.string()
                .describe(
                    "The technical question that can be asked in the interview"
                ),

            intention: z.string()
                .describe(
                    "The intention of the interviewer behind asking this question"
                ),

            answer: z.string()
                .describe(
                    "How the candidate should answer this question and what points to cover"
                )

        })
    )
        .describe(
            "Technical interview questions with intention and answer guidance"
        ),


    behavioralQuestions: z.array(
        z.object({

            question: z.string()
                .describe(
                    "The behavioral question that can be asked in the interview"
                ),

            intention: z.string()
                .describe(
                    "The intention of the interviewer behind asking this question"
                ),

            answer: z.string()
                .describe(
                    "How the candidate should answer this question and what points to cover"
                )

        })
    )
        .describe(
            "Behavioral interview questions with intention and answer guidance"
        ),


    skillGaps: z.array(
        z.object({

            skill: z.string()
                .describe(
                    "The skill which the candidate is lacking"
                ),

            severity: z.enum([
                "low",
                "medium",
                "high"
            ])
                .describe(
                    "The severity of this skill gap"
                )

        })
    )
        .describe(
            "List of skill gaps and their severity"
        ),


    preparationPlan: z.array(
        z.object({

            day: z.number()
                .describe(
                    "The day number in the preparation plan starting from 1"
                ),

            focus: z.string()
                .describe(
                    "The main focus of this preparation day"
                ),

            tasks: z.array(z.string())
                .describe(
                    "Tasks to complete on this day"
                )

        })
    )
        .describe(
            "A day-wise preparation plan"
        ),


    title: z.string()
        .describe(
            "The title of the job for which the interview report is generated"
        )

});


// ======================================================
// GENERATE INTERVIEW REPORT
// ======================================================

async function generateInterviewReport({
    resume,
    selfDescription,
    jobDescription
}) {

    try {

        console.log(
            "Generating interview report..."
        );


        const prompt = `
Generate an interview preparation report for a candidate.

========================
RESUME
========================

${resume || "No resume provided"}


========================
SELF DESCRIPTION
========================

${selfDescription || "No self description provided"}


========================
JOB DESCRIPTION
========================

${jobDescription}


========================
INSTRUCTIONS
========================

Analyze the candidate's resume, self description and job description.

Generate:

1. Match score between 0 and 100
2. Technical interview questions
3. Behavioral interview questions
4. Skill gaps
5. Day-wise preparation plan
6. Job title

Make the questions relevant to the job description and candidate profile.
`;


        const response = await generateResumeContent(
            prompt,
            zodToJsonSchema(interviewReportSchema)
        );


        const result =
            JSON.parse(response.text);


        console.log(
            "Interview report generated successfully"
        );


        return result;


    } catch (error) {

        console.error(
            "Generate Interview Report Error:",
            error
        );

        throw toServiceError(error, "Failed to generate interview report.");

    }

}


// ======================================================
// GENERATE PDF FROM HTML
// ======================================================

async function generatePdfFromHtml(htmlContent) {

    let browser = null;

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "Starting Chromium PDF generation..."
        );

        console.log(
            "=========================================="
        );


        // ==================================================
        // GET CHROMIUM EXECUTABLE PATH
        // ==================================================

        const isLinux = process.platform === "linux";
        const executablePath = isLinux
            ? await chromium.executablePath()
            : findLocalBrowserExecutable();

        if (!executablePath) {
            throw new ServiceError(
                "No local Chrome or Edge executable was found. Install Chrome/Edge or set PUPPETEER_EXECUTABLE_PATH.",
                { code: "LOCAL_BROWSER_PATH_REQUIRED" }
            );
        }


        console.log(
            "Chromium executable path:",
            executablePath
        );


        // ==================================================
        // LAUNCH CHROMIUM
        // ==================================================

        browser =
            await puppeteer.launch({

                executablePath,

                args: isLinux
                    ? chromium.args
                    : ["--disable-gpu", "--no-first-run", "--no-default-browser-check"],

                headless: true,

                // Pipe transport avoids local Windows WebSocket/debug-port restrictions.
                pipe: !isLinux,

                defaultViewport: {

                    width: 1280,

                    height: 720

                },

                timeout: 15000

            });


        console.log(
            "Chromium launched successfully"
        );


        // ==================================================
        // CREATE NEW PAGE
        // ==================================================

        const page =
            await browser.newPage();


        console.log(
            "New browser page created"
        );


        // ==================================================
        // SET PAGE CONTENT
        // ==================================================

        await page.setContent(
            htmlContent,
            {
                waitUntil: "domcontentloaded",
                timeout: 30000
            }
        );


        console.log(
            "HTML loaded successfully"
        );


        // ==================================================
        // GENERATE PDF
        // ==================================================

        const pdfBuffer = Buffer.from(
            await page.pdf({

                format: "A4",

                printBackground: true,

                preferCSSPageSize: false,

                margin: {

                    top: "15mm",

                    bottom: "15mm",

                    left: "15mm",

                    right: "15mm"

                }

            })
        );


        console.log(
            "PDF generated successfully"
        );


        console.log(
            "PDF size:",
            pdfBuffer.length,
            "bytes"
        );


        return pdfBuffer;


    } catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "PDF GENERATION ERROR"
        );

        console.error(
            error
        );

        console.error(
            "=========================================="
        );

        throw toServiceError(error, "Failed to generate PDF from resume HTML.");


    } finally {


        // ==================================================
        // CLOSE BROWSER
        // ==================================================

        if (browser) {

            try {

                await browser.close();

                console.log(
                    "Chromium closed successfully"
                );

            } catch (closeError) {

                console.error(
                    "Error while closing Chromium:",
                    closeError
                );

            }

        }

    }

}


// ======================================================
// GENERATE RESUME PDF
// ======================================================

async function generateResumePdf({
    resume,
    selfDescription,
    jobDescription
}) {

    try {

        console.log(
            "=========================================="
        );

        console.log(
            "Starting resume generation..."
        );

        console.log(
            "=========================================="
        );


        // ==================================================
        // RESUME SCHEMA
        // ==================================================

        const resumePdfSchema = z.object({

            html: z.string()
                .describe(
                    "Complete HTML content of the professional resume"
                )

        });


        // ==================================================
        // GEMINI PROMPT
        // ==================================================

        const prompt = `
Create a professional, ATS-friendly resume for the candidate.

========================
ORIGINAL RESUME
========================

${resume || "No resume provided"}


========================
SELF DESCRIPTION
========================

${selfDescription || "No self description provided"}


========================
TARGET JOB DESCRIPTION
========================

${jobDescription}


========================
IMPORTANT REQUIREMENTS
========================

1. Tailor the resume to the target job description.

2. Highlight skills and experience relevant to the target job.

3. Do NOT invent fake experience, education, projects, companies or achievements.

4. Only use information available in the candidate information.

5. Keep the resume professional and human-written.

6. Keep the resume approximately 1-2 pages.

7. Make the resume ATS friendly.

8. Use simple and professional formatting.

9. Use semantic HTML.

10. Use CSS inside a <style> tag.

11. Do NOT use JavaScript.

12. Do NOT use external CSS files.

13. Do NOT use external images.

14. Do NOT use external fonts.

15. The HTML must work without an internet connection.

16. Use a clean professional layout.

17. Avoid excessive colors.

18. Make sure the text is easy for ATS systems to parse.

19. Include relevant sections when information is available:

    - Name
    - Contact Information
    - Professional Summary
    - Technical Skills
    - Experience
    - Projects
    - Education
    - Certifications
    - Achievements

20. Do not add empty sections.

21. Do not mention that the resume was generated by AI.

22. Do not include markdown.

23. Return a complete HTML document.

The response MUST be a JSON object in this format:

{
    "html": "<complete HTML document>"
}
`;


        // ==================================================
        // CALL GEMINI
        // ==================================================

        console.log(
            "Sending resume request to Gemini..."
        );


        const response = await generateResumeContent(
            prompt,
            zodToJsonSchema(resumePdfSchema)
        );


        console.log(
            "Gemini resume response received"
        );


        // ==================================================
        // PARSE GEMINI RESPONSE
        // ==================================================

        let jsonContent;
        try {
            jsonContent = JSON.parse(response.text);
        } catch (error) {
            throw new ServiceError("Gemini returned invalid resume content.", {
                code: "INVALID_GEMINI_HTML",
                cause: error
            });
        }


        // ==================================================
        // VALIDATE HTML
        // ==================================================

        if (
            !jsonContent ||
            typeof jsonContent.html !== "string" ||
            !jsonContent.html.trim()
        ) {

            throw new ServiceError("Gemini did not return valid resume HTML.", {
                code: "INVALID_GEMINI_HTML"
            });

        }


        console.log(
            "Resume HTML generated successfully"
        );


        // ==================================================
        // CONVERT HTML → PDF
        // ==================================================

        const pdfBuffer =
            await generatePdfFromHtml(makePdfSafeHtml(jsonContent.html));


        // ==================================================
        // RETURN PDF
        // ==================================================

        return pdfBuffer;


    } catch (error) {

        console.error(
            "=========================================="
        );

        console.error(
            "GENERATE RESUME PDF ERROR"
        );

        console.error(
            error
        );

        console.error(
            "=========================================="
        );

        throw toServiceError(error, "Failed to generate resume PDF.");

    }

}


// ======================================================
// EXPORT
// ======================================================

module.exports = {

    generateInterviewReport,

    generateResumePdf,
    generatePdfFromHtml

};

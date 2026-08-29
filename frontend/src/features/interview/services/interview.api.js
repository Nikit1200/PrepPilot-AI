import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
    import.meta.env.DEV
        ? "http://localhost:3000"
        : "https://careermateai-jevf.onrender.com"
);

// ======================================================
// AXIOS INSTANCE
// ======================================================

const api = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true
});


// ======================================================
// TOKEN INTERCEPTOR
// ======================================================

api.interceptors.request.use(
    (config) => {

        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        return config;
    },

    (error) => {
        return Promise.reject(error);
    }
);


// ======================================================
// GENERATE INTERVIEW REPORT
// ======================================================

export const generateInterviewReport = async ({
    jobDescription,
    selfDescription,
    resumeFile
}) => {

    const formData = new FormData();

    formData.append(
        "jobDescription",
        jobDescription
    );

    formData.append(
        "selfDescription",
        selfDescription || ""
    );

    // Resume is optional
    if (resumeFile) {
        formData.append(
            "resume",
            resumeFile
        );
    }


    const response = await api.post(
        "/api/interview/",
        formData
    );


    return response.data;
};


// ======================================================
// GET INTERVIEW REPORT BY ID
// ======================================================

export const getInterviewReportById = async (
    interviewId
) => {

    const response = await api.get(
        `/api/interview/report/${interviewId}`
    );

    return response.data;
};


// ======================================================
// GET ALL INTERVIEW REPORTS
// ======================================================

export const getAllInterviewReports = async () => {

    const response = await api.get(
        "/api/interview/"
    );

    return response.data;
};


// ======================================================
// GENERATE RESUME PDF
// ======================================================

export const generateResumePdf = async ({
    interviewReportId
}) => {
    try {
        const response = await api.post(
            `/api/interview/resume/pdf/${interviewReportId}`,
            null,
            { responseType: "blob" }
        );

        return response.data;
    } catch (error) {
        // Axios returns the JSON error body as a Blob when responseType is "blob".
        if (error.response?.data instanceof Blob) {
            try {
                const payload = JSON.parse(await error.response.data.text());
                error.message = payload.message || error.message;
            } catch {
                // Keep Axios's original error when the response is not JSON.
            }
        }
        throw error;
    }
};

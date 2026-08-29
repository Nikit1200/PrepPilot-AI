class ServiceError extends Error {
    constructor(message, { status = 500, code = "SERVICE_ERROR", cause } = {}) {
        super(message);
        this.name = "ServiceError";
        this.status = status;
        this.code = code;
        this.cause = cause;
    }
}

function toServiceError(error, fallbackMessage) {
    if (error instanceof ServiceError) return error;

    const status = Number(error?.status || error?.code || error?.response?.status);
    if (status === 429 || /RESOURCE_EXHAUSTED|quota exceeded|rate limit/i.test(error?.message || "")) {
        return new ServiceError("Gemini API quota exceeded. Please try again later.", {
            status: 429,
            code: "GEMINI_QUOTA_EXCEEDED",
            cause: error
        });
    }

    // The request did not reach Gemini at all (DNS, firewall, proxy, or TLS failure).
    if (/fetch failed|network|ECONNRESET|ENOTFOUND|ETIMEDOUT|ECONNREFUSED/i.test(error?.message || "")) {
        return new ServiceError("Unable to reach the Gemini API. Check the server network connection and try again.", {
            status: 503,
            code: "GEMINI_UNREACHABLE",
            cause: error
        });
    }

    return new ServiceError(fallbackMessage, { cause: error });
}

module.exports = { ServiceError, toServiceError };

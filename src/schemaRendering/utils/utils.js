import { getFieldValue, getAllFields } from './fieldUtils';

/**
 * Execute a retriever script with dynamic parameters from form values
 * @param {Object} options - Configuration object
 * @param {string} options.retrieverPath - Path to the retriever script (required)
 * @param {Object} [options.retrieverParams={}] - Parameters to pass (supports $fieldName references)
 * @param {Object} [options.formValues={}] - Current form values for resolving $fieldName
 * @param {boolean} [options.parseJSON=false] - Whether to parse response as JSON
 * @param {Function} [options.onError] - Error callback
 * @returns {Promise<any>} Script result
 */
export async function executeScript({
    retrieverPath,
    retrieverParams = {},
    formValues = {},
    parseJSON = false,
    environment = null,
    onError = null
}) {
    if (!retrieverPath) {
        const error = {
            message: "Retriever path is not set",
            status_code: 400,
            details: ""
        };
        onError?.(error);
        throw error;
    }

    const params = new URLSearchParams();

    

    if (environment && environment.env && environment.src) {
        const envPath = `${environment.src}/${environment.env}`;
        params.append('DRONA_ENV_DIR', envPath);
        params.append('DRONA_ENV_NAME', environment.env);
    }

    // Process retriever params - resolve $fieldName references
    if (retrieverParams && typeof retrieverParams === 'object') {
        Object.entries(retrieverParams).forEach(([key, value]) => {
            if (typeof value === 'string' && value.startsWith('$')) {
                const fieldName = value.substring(1);
                const fieldValue = getFieldValue(formValues, fieldName);
                if (fieldValue !== undefined) {
                    params.append(key, JSON.stringify(fieldValue));
                }
            } else {
                params.append(key, JSON.stringify(value));
            }
        });
    }

    const queryString = params.toString();
    const curUrl = document.dashboard_url;

    const requestUrl = `${curUrl}/jobs/composer/evaluate_script?retriever_path=${encodeURIComponent(
        retrieverPath
    )}${queryString ? `&${queryString}` : ""}`;

    const response = await fetch(requestUrl);

    if (!response.ok) {
        let errorData = {};
        try {
            errorData = await response.json();
        } catch {}

        const error = {
            message: errorData.message || "Failed to execute script",
            status_code: response.status,
            details: errorData.details || errorData
        };
        onError?.(error);
        throw error;
    }

    const data = await response.json();

    if (data.task_id) {
        return await _pollTaskResult(data.task_id, curUrl, parseJSON, onError);
    }

    return parseJSON ? data : data;
}

async function _pollTaskResult(taskId, curUrl, parseJSON, onError) {
    while (true) {
        await new Promise(resolve => setTimeout(resolve, 500));

        const res = await fetch(`${curUrl}/jobs/composer/task_status?task_id=${encodeURIComponent(taskId)}`);

        if (!res.ok) {
            const error = { message: "Failed to poll task status", status_code: res.status };
            onError?.(error);
            throw error;
        }

        const status = await res.json();

        if (status.state === 'SUCCESS') {
            const raw = status.result?.result ?? status.result;
            if (parseJSON) {
                return typeof raw === 'string' ? JSON.parse(raw) : raw;
            }
            return raw;
        }

        if (status.state === 'FAILURE') {
            const error = { message: status.error || 'Task failed', status_code: 500, details: status };
            onError?.(error);
            throw error;
        }
        // PENDING / PROGRESS — keep polling
    }
}

/**
 * Fetch the text content of a .js file from the server
 * @param {Object} options
 * @param {string} options.filePath - Path to the .js file (relative to env dir or absolute)
 * @param {Object} [options.environment] - Environment context with env and src fields
 * @returns {Promise<string>} File text content
 */
export async function fetchFileContent({ filePath, environment }) {
    const params = new URLSearchParams();
    params.append('file_path', filePath);

    if (environment && environment.env && environment.src) {
        const envPath = `${environment.src}/${environment.env}`;
        params.append('DRONA_ENV_DIR', envPath);
    }

    const curUrl = document.dashboard_url;

    const requestUrl = `${curUrl}/jobs/composer/read_file?${params.toString()}`;
    const response = await fetch(requestUrl);

    if (!response.ok) {
        let errorData = {};
        try { errorData = await response.json(); } catch {}
        throw new Error(errorData.message || "Failed to read init code file");
    }

    return await response.text();
}

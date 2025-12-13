// LOCAL STORAGE SERVICE - NO API CALLS
// All data stored in browser's IndexedDB

const DB_NAME = "DrawingsDB";
const DB_VERSION = 1;
const STORE_NAME = "drawings";

/**
 * Initialize IndexedDB
 */
const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
};

/**
 * Initialize storage (local only, no API calls)
 */
export const initializeStorage = async () => {
    try {
        await initDB();
        return { success: true };
    } catch (error) {
        console.error("Error initializing storage:", error);
        return { success: false, error };
    }
};

/**
 * Upload a file (store locally in IndexedDB)
 * @param {File|Blob} file - The file to upload
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{success: boolean, url?: string, error?: any}>}
 */
export const uploadFile = async (file, fileName = null) => {
    try {
        const db = await initDB();
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substring(2, 9);
        const name = fileName || `drawing-${timestamp}-${randomId}.png`;

        // Convert blob to base64
        const dataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });

        const fileData = {
            id: name,
            name: name,
            data: dataUrl,
            size: file.size,
            type: file.type,
            created_at: timestamp,
        };

        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        await store.put(fileData);

        return {
            success: true,
            url: dataUrl,
            path: name,
        };
    } catch (error) {
        console.error("Error uploading file:", error);
        return { success: false, error };
    }
};

/**
 * Upload canvas as image (store locally)
 * @param {HTMLCanvasElement} canvas - The canvas element
 * @param {string} fileName - Optional custom file name
 * @returns {Promise<{success: boolean, url?: string, error?: any}>}
 */
export const uploadCanvas = async (canvas, fileName = null) => {
    try {
        return new Promise((resolve) => {
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    resolve({ success: false, error: "Failed to create blob from canvas" });
                    return;
                }

                const result = await uploadFile(blob, fileName);
                resolve(result);
            }, "image/png");
        });
    } catch (error) {
        console.error("Error uploading canvas:", error);
        return { success: false, error };
    }
};

/**
 * List all files in local storage
 * @returns {Promise<{success: boolean, files?: Array, error?: any}>}
 */
export const listFiles = async () => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const files = request.result.map((file) => ({
                    id: file.id,
                    name: file.name,
                    url: file.data,
                    size: file.size,
                    type: file.type,
                    created_at: file.created_at,
                }));
                resolve({ success: true, files });
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error listing files:", error);
        return { success: false, error };
    }
};

/**
 * Delete a file from local storage
 * @param {string} fileName - The file name/id
 * @returns {Promise<{success: boolean, error?: any}>}
 */
export const deleteFile = async (fileName) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], "readwrite");
        const store = transaction.objectStore(STORE_NAME);
        await store.delete(fileName);

        return { success: true };
    } catch (error) {
        console.error("Error deleting file:", error);
        return { success: false, error };
    }
};

/**
 * Download a file from local storage
 * @param {string} fileName - The file name/id
 * @returns {Promise<{success: boolean, blob?: Blob, error?: any}>}
 */
export const downloadFile = async (fileName) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fileName);

        return new Promise((resolve, reject) => {
            request.onsuccess = () => {
                const file = request.result;
                if (!file) {
                    resolve({ success: false, error: "File not found" });
                    return;
                }

                // Convert base64 to blob
                fetch(file.data)
                    .then((res) => res.blob())
                    .then((blob) => resolve({ success: true, blob }))
                    .catch((error) => resolve({ success: false, error }));
            };
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Error downloading file:", error);
        return { success: false, error };
    }
};

/**
 * Get data URL for a file (local storage)
 * @param {string} fileName - The file name/id
 * @returns {Promise<string>}
 */
export const getPublicUrl = async (fileName) => {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], "readonly");
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(fileName);

        return new Promise((resolve) => {
            request.onsuccess = () => {
                const file = request.result;
                resolve(file ? file.data : "");
            };
            request.onerror = () => resolve("");
        });
    } catch (error) {
        console.error("Error getting URL:", error);
        return "";
    }
};

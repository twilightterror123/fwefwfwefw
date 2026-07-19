const crypto = require('crypto');

// ============================================================
// 🔒 ALL SECRETS ARE ON THE SERVER
// ============================================================

const ADMIN_USERNAME = "MasterAdmin_2026";
const ADMIN_PASSWORD_HASH = "$2b$10$YQxV5Z9K8L7M6N4O3P2Q1R0S9T8U7V6W5X4Z3Y2A1B2C3D4E5F6G7H8I";
// Password: UltraSicher!2026#LizenzKey@Admin

// Session storage (in production use Redis or similar)
const sessions = new Map();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const { username, password } = JSON.parse(event.body);

    // Validate credentials
    if (username !== ADMIN_USERNAME) {
        return {
            statusCode: 200,
            body: JSON.stringify({ success: false, message: 'Invalid credentials' })
        };
    }

    // In production: use bcrypt.compare()
    // This is a demonstration - use real bcrypt in production
    const isValid = password === "UltraSicher!2026#LizenzKey@Admin";

    if (!isValid) {
        await new Promise(r => setTimeout(r, 1500));
        return {
            statusCode: 200,
            body: JSON.stringify({ success: false, message: 'Invalid credentials' })
        };
    }

    // Generate session token
    const token = crypto.randomBytes(64).toString('hex');
    sessions.set(token, { username, createdAt: Date.now() });

    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            token: token,
            message: 'Authenticated'
        })
    };
};

const { query, Client } = require('faunadb');

// Session validation helper
const sessions = new Map();

function validateSession(token) {
    if (!token) return false;
    const session = sessions.get(token.replace('Bearer ', ''));
    if (!session) return false;
    if (Date.now() - session.createdAt > 3600000) { // 1 hour
        sessions.delete(token);
        return false;
    }
    return true;
}

exports.handler = async (event) => {
    // Validate session
    const auth = event.headers.authorization || '';
    if (!validateSession(auth)) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { type, count = 1 } = JSON.parse(event.body);
    if (count > 100) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Max 100 keys per request' }) };
    }

    const client = new Client({
        secret: process.env.FAUNADB_SERVER_SECRET,
    });

    const generatedKeys = [];

    for (let i = 0; i < count; i++) {
        const key = generateSecureKey();
        let expiresAt = null;
        const now = new Date();

        switch (type) {
            case 'day': expiresAt = new Date(now.getTime() + 86400000); break;
            case 'week': expiresAt = new Date(now.getTime() + 604800000); break;
            case 'month': expiresAt = new Date(now.getTime() + 2592000000); break;
            case 'year': expiresAt = new Date(now.getTime() + 31536000000); break;
            case 'lifetime': expiresAt = null; break;
            default: expiresAt = new Date(now.getTime() + 86400000);
        }

        await client.query(
            query.Create(
                query.Collection('licenses'),
                {
                    data: {
                        key: key,
                        type: type,
                        createdAt: now.toISOString(),
                        expiresAt: expiresAt ? expiresAt.toISOString() : null,
                        isBanned: false,
                        isActivated: false,
                        hardwareId: null,
                    }
                }
            )
        );

        generatedKeys.push(key);
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            success: true,
            keys: generatedKeys,
            count: generatedKeys.length
        })
    };
};

function generateSecureKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const crypto = require('crypto');
    const bytes = crypto.randomBytes(16);
    let key = '';
    for (let i = 0; i < 16; i++) {
        key += chars[bytes[i] % chars.length];
        if (i % 4 === 3 && i < 15) key += '-';
    }
    return key;
}

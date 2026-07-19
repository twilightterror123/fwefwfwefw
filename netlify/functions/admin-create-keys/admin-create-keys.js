// netlify/functions/admin-create-keys/admin-create-keys.js
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// Session Storage (MUSS mit admin-login synchron sein!)
const sessions = new Map();

function validateSession(token) {
    if (!token) return false;
    
    // "Bearer " entfernen
    const cleanToken = token.replace('Bearer ', '');
    const session = sessions.get(cleanToken);
    
    if (!session) return false;
    
    // Session nach 1 Stunde ablaufen lassen
    if (Date.now() - session.createdAt > 3600000) {
        sessions.delete(cleanToken);
        return false;
    }
    
    return true;
}

function generateSecureKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const bytes = crypto.randomBytes(16);
    let key = '';
    for (let i = 0; i < 16; i++) {
        key += chars[bytes[i] % chars.length];
        if (i % 4 === 3 && i < 15) key += '-';
    }
    return key;
}

exports.handler = async (event) => {
    // 1. Session prüfen
    const auth = event.headers.authorization || '';
    if (!validateSession(auth)) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ 
                error: 'Unauthorized',
                message: 'Invalid or expired session'
            }) 
        };
    }

    // 2. Request parsen
    let type, count;
    try {
        const body = JSON.parse(event.body);
        type = body.type || 'day';
        count = parseInt(body.count) || 1;
    } catch (e) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Invalid request body' })
        };
    }

    if (count > 100) {
        return { 
            statusCode: 400, 
            body: JSON.stringify({ error: 'Max 100 keys per request' }) 
        };
    }

    // 3. Supabase Client
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

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

        // 4. In Supabase speichern
        const { error } = await supabase
            .from('licenses')
            .insert({
                key: key,
                type: type,
                created_at: now.toISOString(),
                expires_at: expiresAt ? expiresAt.toISOString() : null,
                is_banned: false,
                is_activated: false,
                hardware_id: null
            });

        if (error) {
            console.error('Supabase Error:', error);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    success: false, 
                    error: 'Database error: ' + error.message 
                })
            };
        }

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

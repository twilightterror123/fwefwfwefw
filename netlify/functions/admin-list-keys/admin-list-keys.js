// netlify/functions/admin-list-keys/admin-list-keys.js
const { createClient } = require('@supabase/supabase-js');

const sessions = new Map();

function validateSession(token) {
    if (!token) return false;
    const cleanToken = token.replace('Bearer ', '');
    const session = sessions.get(cleanToken);
    if (!session) return false;
    if (Date.now() - session.createdAt > 3600000) {
        sessions.delete(cleanToken);
        return false;
    }
    return true;
}

exports.handler = async (event) => {
    const auth = event.headers.authorization || '';
    if (!validateSession(auth)) {
        return { 
            statusCode: 401, 
            body: JSON.stringify({ error: 'Unauthorized' }) 
        };
    }

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        const { data, error } = await supabase
            .from('licenses')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) throw error;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, keys: data })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};

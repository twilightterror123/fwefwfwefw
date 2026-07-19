// netlify/functions/admin-ban-key/admin-ban-key.js
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

    const { key } = JSON.parse(event.body);

    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    try {
        // 1. Key finden
        const { data: license, error: findError } = await supabase
            .from('licenses')
            .select('*')
            .eq('key', key)
            .single();

        if (findError || !license) {
            return {
                statusCode: 200,
                body: JSON.stringify({ success: false, error: 'Key not found' })
            };
        }

        // 2. Key bannen
        const { error: updateError } = await supabase
            .from('licenses')
            .update({
                is_banned: true,
                banned_at: new Date().toISOString()
            })
            .eq('key', key);

        if (updateError) throw updateError;

        // 3. Hardware-ID in banned_devices speichern
        if (license.hardware_id) {
            await supabase
                .from('banned_devices')
                .insert({
                    hardware_id: license.hardware_id,
                    banned_at: new Date().toISOString(),
                    reason: `Key ${key} banned`
                });
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};

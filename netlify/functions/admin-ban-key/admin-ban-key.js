const { query, Client } = require('faunadb');

const sessions = new Map();

function validateSession(token) {
    if (!token) return false;
    const session = sessions.get(token.replace('Bearer ', ''));
    if (!session) return false;
    if (Date.now() - session.createdAt > 3600000) {
        sessions.delete(token);
        return false;
    }
    return true;
}

exports.handler = async (event) => {
    const auth = event.headers.authorization || '';
    if (!validateSession(auth)) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
    }

    const { key } = JSON.parse(event.body);

    const client = new Client({
        secret: process.env.FAUNADB_SERVER_SECRET,
    });

    try {
        const result = await client.query(
            query.Get(query.Match(query.Index('licenses_by_key'), key))
        );

        await client.query(
            query.Update(result.ref, {
                data: { isBanned: true, bannedAt: new Date().toISOString() }
            })
        );

        if (result.data.hardwareId) {
            await client.query(
                query.Create(
                    query.Collection('banned_devices'),
                    {
                        data: {
                            hardwareId: result.data.hardwareId,
                            bannedAt: new Date().toISOString(),
                            reason: `Key ${key} banned`
                        }
                    }
                )
            );
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (error) {
        return {
            statusCode: 200,
            body: JSON.stringify({ success: false, error: 'Key not found' })
        };
    }
};

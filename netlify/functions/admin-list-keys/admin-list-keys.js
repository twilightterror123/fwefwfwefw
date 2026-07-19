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

    const client = new Client({
        secret: process.env.FAUNADB_SERVER_SECRET,
    });

    try {
        const result = await client.query(
            query.Map(
                query.Paginate(query.Documents(query.Collection('licenses')), { size: 1000 }),
                query.Lambda('ref', query.Get(query.Var('ref')))
            )
        );

        const keys = result.data.map(doc => ({
            id: doc.ref.id,
            ...doc.data
        }));

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, keys })
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: error.message })
        };
    }
};

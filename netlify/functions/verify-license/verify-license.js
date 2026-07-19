const { query, Client } = require('faunadb');

exports.handler = async (event) => {
    const { key, hardwareId } = JSON.parse(event.body);

    const client = new Client({
        secret: process.env.FAUNADB_SERVER_SECRET,
    });

    try {
        const result = await client.query(
            query.Get(query.Match(query.Index('licenses_by_key'), key))
        );

        const license = result.data;

        // Check banned
        if (license.isBanned) {
            return { statusCode: 200, body: JSON.stringify({ valid: false, banned: true }) };
        }

        // Check expiry
        if (license.type !== 'lifetime' && license.expiresAt) {
            if (new Date(license.expiresAt) < new Date()) {
                return { statusCode: 200, body: JSON.stringify({ valid: false }) };
            }
        }

        // First activation
        if (!license.isActivated) {
            await client.query(
                query.Update(result.ref, {
                    data: {
                        isActivated: true,
                        hardwareId: hardwareId,
                        activatedAt: new Date().toISOString()
                    }
                })
            );
            return { statusCode: 200, body: JSON.stringify({ valid: true }) };
        }

        // Check hardware binding (1 device per key)
        if (license.hardwareId !== hardwareId) {
            return { statusCode: 200, body: JSON.stringify({ valid: false }) };
        }

        return { statusCode: 200, body: JSON.stringify({ valid: true }) };
    } catch (error) {
        return { statusCode: 200, body: JSON.stringify({ valid: false }) };
    }
};

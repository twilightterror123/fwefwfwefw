// netlify/functions/admin-login/admin-login.js
const crypto = require('crypto');

// FESTE ZUGANGSDATEN
const ADMIN_USERNAME = "MasterAdmin_2026";
const ADMIN_PASSWORD = "UltraSicher!2026#LizenzKey@Admin";

// Sessions im Speicher (bei Netlify Serverless NICHT persistent!)
// Für Produktion: Datenbank oder Redis verwenden!
const sessions = new Map();

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { username, password } = JSON.parse(event.body);

        // 1. Username prüfen
        if (username !== ADMIN_USERNAME) {
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid credentials' 
                })
            };
        }

        // 2. Passwort prüfen
        if (password !== ADMIN_PASSWORD) {
            // Brute-Force Schutz
            await new Promise(resolve => setTimeout(resolve, 1500));
            return {
                statusCode: 200,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid credentials' 
                })
            };
        }

        // 3. Session Token generieren
        const token = crypto.randomBytes(64).toString('hex');
        sessions.set(token, { 
            username, 
            createdAt: Date.now() 
        });

        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                token: token,
                message: 'Authenticated'
            })
        };

    } catch (error) {
        return {
            statusCode: 400,
            body: JSON.stringify({ 
                success: false, 
                message: 'Invalid request' 
            })
        };
    }
};

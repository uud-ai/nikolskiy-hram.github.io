// Шаг 1 OAuth-логина Decap CMS: перенаправляет в GitHub на страницу авторизации.
// GET /api/auth
module.exports = (req, res) => {
    const clientId = process.env.OAUTH_CLIENT_ID;
    if (!clientId) {
        res.statusCode = 500;
        res.end('OAUTH_CLIENT_ID is not configured');
        return;
    }

    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);

    res.setHeader(
        'Set-Cookie',
        `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
    );

    const params = new URLSearchParams({
        client_id: clientId,
        // Репозиторий сайта публичный — достаточно public_repo, без доступа к приватным репозиториям
        scope: 'public_repo',
        state,
    });

    res.statusCode = 302;
    res.setHeader('Location', `https://github.com/login/oauth/authorize?${params.toString()}`);
    res.end();
};

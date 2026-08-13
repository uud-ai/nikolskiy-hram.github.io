// Шаг 2 OAuth-логина Decap CMS: GitHub возвращается сюда с ?code=...,
// мы меняем code на access_token и передаём его обратно во всплывающее окно
// админки через postMessage — по протоколу, который ожидает decap-cms github backend.
// GET /api/callback?code=...&state=...

function parseCookies(header) {
    const cookies = {};
    if (!header) return cookies;
    header.split(';').forEach((pair) => {
        const idx = pair.indexOf('=');
        if (idx === -1) return;
        const key = pair.slice(0, idx).trim();
        const val = pair.slice(idx + 1).trim();
        cookies[key] = decodeURIComponent(val);
    });
    return cookies;
}

function renderMessage(status, content) {
    const message = `authorization:github:${status}:${content}`;
    return `<!DOCTYPE html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener("message", receiveMessage, false);
  }
  window.addEventListener("message", receiveMessage, false);
  window.opener.postMessage("authorizing:github", "*");
})();
</script>
</body></html>`;
}

module.exports = async (req, res) => {
    const clientId = process.env.OAUTH_CLIENT_ID;
    const clientSecret = process.env.OAUTH_CLIENT_SECRET;
    const url = new URL(req.url, `https://${req.headers.host}`);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const cookies = parseCookies(req.headers.cookie);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    if (!code || !state || state !== cookies.oauth_state) {
        res.statusCode = 400;
        res.end(renderMessage('error', JSON.stringify({ message: 'Неверный запрос авторизации (state mismatch).' })));
        return;
    }

    try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
            }),
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.access_token) {
            res.statusCode = 400;
            res.end(renderMessage('error', JSON.stringify({
                message: tokenData.error_description || 'Не удалось получить токен.',
            })));
            return;
        }

        res.setHeader('Set-Cookie', 'oauth_state=; Path=/; Max-Age=0');
        res.end(renderMessage('success', JSON.stringify({
            token: tokenData.access_token,
            provider: 'github',
        })));
    } catch (err) {
        res.statusCode = 500;
        res.end(renderMessage('error', JSON.stringify({ message: 'Ошибка сервера при обмене токена.' })));
    }
};

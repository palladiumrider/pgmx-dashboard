// Netlify serverless function: save-custom-spot.js
// Saves custom spot prices to data/custom-spot.json in the GitHub repo
// Deploy to: netlify/functions/save-custom-spot.js

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const REPO         = process.env.GITHUB_REPO; // e.g. "palladiumrider/pgmx-dashboard"

  if (!GITHUB_TOKEN || !REPO) {
    return { statusCode: 500, body: 'Missing GITHUB_TOKEN or GITHUB_REPO env vars' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const content = Buffer.from(JSON.stringify(payload, null, 2)).toString('base64');
  const path    = 'data/custom-spot.json';
  const apiUrl  = `https://api.github.com/repos/${REPO}/contents/${path}`;

  // Get current SHA if file exists (needed for update)
  let sha;
  try {
    const getResp = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    if (getResp.ok) {
      const data = await getResp.json();
      sha = data.sha;
    }
  } catch (_) {}

  // Write file
  const body = {
    message: `custom-spot: update for ${payload.gfex_date || 'unknown date'}`,
    content,
    ...(sha ? { sha } : {})
  };

  const putResp = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    body: JSON.stringify(body)
  });

  if (putResp.ok) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } else {
    const err = await putResp.text();
    return { statusCode: 500, body: `GitHub API error: ${err}` };
  }
};

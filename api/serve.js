// এই function টাই আসল "hosting" কাজটা করে:
// yoursite.vercel.app/username/path এ request আসলে
// Firestore এর "sites/{username}" ডকুমেন্ট থেকে ফাইলের কনটেন্ট টেনে এনে দেখায়।
// (Firebase Storage ব্যবহার করা হয়নি, কারণ Storage এখন Blaze/কার্ড লাগে — Firestore এখনো ফ্রি)

export default async function handler(req, res) {
  const { username, path } = req.query;

  if (!username) {
    res.status(400).send('ইউজারনেম দেওয়া হয়নি');
    return;
  }

  let filePath = path;
  if (Array.isArray(filePath)) filePath = filePath.join('/');
  if (!filePath || filePath === '') filePath = 'index.html';

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/sites/${encodeURIComponent(username)}`;

  try {
    const upstream = await fetch(firestoreUrl);

    if (!upstream.ok) {
      res.status(404).send(renderNotFound(username));
      return;
    }

    const docJson = await upstream.json();
    const filesMap = docJson?.fields?.files?.mapValue?.fields || {};
    const fileEntry = filesMap[filePath];

    if (!fileEntry) {
      res.status(404).send(renderNotFound(username));
      return;
    }

    const content = fileEntry.stringValue ?? '';
    res.setHeader('Content-Type', getContentType(filePath));
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.status(200).send(content);
  } catch (err) {
    res.status(500).send('সার্ভার এরর — একটু পর আবার চেষ্টা করুন');
  }
}

function getContentType(filePath) {
  const ext = (filePath.split('.').pop() || '').toLowerCase();
  const types = {
    html: 'text/html; charset=utf-8',
    htm: 'text/html; charset=utf-8',
    css: 'text/css',
    js: 'application/javascript',
    mjs: 'application/javascript',
    json: 'application/json',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    md: 'text/plain',
  };
  return types[ext] || 'text/plain';
}

function renderNotFound(username) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>404</title>
<style>body{font-family:sans-serif;background:#0b0e14;color:#e8eaf0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center;}
h1{font-size:48px;margin-bottom:8px;} p{color:#8b93a7;}</style></head>
<body><div><h1>404</h1><p>"${username}" এর জন্য সাইট পাওয়া যায়নি, অথবা index.html আপলোড করা হয়নি।</p></div></body></html>`;
                         }

const env = require('../config/environment');
const config = require('../config/ai');
const GEMINI_KEY = config.getGeminiKey();
const fetcher = (typeof fetch !== 'undefined') ? fetch : (...args) => require('node-fetch')(...args);
let AISuggestion;
try { AISuggestion = require('../models/AISuggestion'); } catch (e) { AISuggestion = null; }

// simple local fallback generator (short, non-ML)
function generateLocalSuggestion(text) {
    const strip = (s) => String(s || '').replace(/[\r\n]+/g, ' ').replace(/["“”'`]/g, '').trim();
    const t = strip(text);
    if (!t) return 'Mình trả lời sau nhé.';

    // Date / time handled earlier; here we handle general replies without echo
    const isQuestion = /[?？]|^(ai|gì|khi nào|sao|như thế nào|có thể|phải không|làm sao)/i.test(t);
    const containsThanks = /cảm ơn|thanks|thank/i.test(t);
    const containsHello = /^(xin chào|chào|hi|hello|hey)/i.test(t);

    if (containsThanks) return 'Không có gì, mình rất vui được giúp bạn.';
    if (containsHello) return 'Chào bạn! Mình có thể giúp gì cho bạn?';

    // extract keywords (not full echo)
    const stopwords = new Set(['mình', 'tôi', 'bạn', 'anh', 'chị', 'em', 'ạ', 'à', 'nhé', 'đã', 'sẽ', 'đó', 'này', 'kia', 'và', 'là', 'của', 'cho', 'với', 'có', 'không', 'như', 'để', 'trong', 'ra', 'vì', 'theo']);
    const words = t.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z0-9\u00C0-\u024F\u1EA0-\u1EFFạảấầẩẫậắằẳẵặèéẹềếểễệìíịòóọôốồổỗộơớờởỡợùúụưứừửữựỳýỵỷỹđ-]/g, '')).filter(Boolean);
    const keywords = words.filter(w => !stopwords.has(w)).slice(0, 5);
    const summary = keywords.join(' ') || words.slice(0, 5).join(' ');

    // templates that RESPOND (do not copy the original message)
    const qTemplates = [
        `Mình nghĩ ${summary} là một khả năng.`,
        `Có thể thử theo hướng ${summary}.`,
        `Mình đoán là ${summary}, bạn thấy sao?`
    ];
    const sTemplates = [
        `Mình hiểu — sẽ xử lý liên quan tới ${summary}.`,
        `Vậy nhé, mình sẽ phản hồi sớm.`,
        `Ok, mình đã nắm nội dung và sẽ xem lại.`
    ];

    const pool = isQuestion ? qTemplates : sTemplates;
    // deterministic pick
    let hash = 0;
    for (let i = 0; i < t.length; i++) hash = ((hash << 5) - hash) + t.charCodeAt(i);
    const idx = Math.abs(hash) % pool.length;
    let reply = pool[idx].trim();
    if (!/[.!?…]$/.test(reply)) reply += '.';
    if (reply.length > 160) reply = reply.slice(0, 157).trim() + '...';
    return reply;
}

// ensure one concise sentence
function enforceOneSentence(s, maxLen = 160) {
    if (!s) return '';
    let t = String(s || '').trim();
    // remove leading labels
    t = t.replace(/^(gợi ý[:\- ]*|suggestion[:\- ]*|reply[:\- ]*)/i, '').trim();
    // extract first sentence
    const m = t.match(/^[\s\S]*?[.!?…](?=\s|$)/);
    let first = m ? m[0].trim() : t.split(/\n/)[0].trim();
    if (!/[.!?…]$/.test(first)) first = first + '.';
    first = first.replace(/\s+/g, ' ').trim();
    if (first.length > maxLen) first = first.slice(0, maxLen - 3).trim() + '...';
    return first;
}

// normalize provider error messages (map quota/404/403 -> clearer codes/messages)
function normalizeProviderError(apiMsg, resStatus) {
    const m = String(apiMsg || '').toLowerCase();
    // Gemini / provider common signals
    if (m.includes('quota') || m.includes('exceed') || m.includes('insufficient_quota') || m.includes('rate limit') || m.includes('you exceeded') || resStatus === 429) {
        const err = new Error('Bạn đã vượt hạn ngạch AI hoặc có giới hạn rate — kiểm tra billing / quota trên Google Cloud.');
        err.status = 429;
        return err;
    }
    if (resStatus === 404 || m.includes('requested entity was not found') || m.includes('model not found')) {
        const err = new Error('Model Gemini không tìm thấy hoặc API chưa được bật cho project — kiểm tra GEMINI_API_KEY và bật Generative Language API trong Google Cloud.');
        err.status = 404;
        return err;
    }
    if (resStatus === 403 || m.includes('permission') || m.includes('forbidden') || m.includes('unauthorized')) {
        const err = new Error('Không có quyền truy cập vào API Gemini — kiểm tra quyền API key và IAM trên Google Cloud.');
        err.status = 403;
        return err;
    }
    // generic provider error
    const err = new Error(apiMsg || `AI provider error (${resStatus})`);
    err.status = resStatus || 502;
    return err;
}

// NEW/REPLACED: obtain access token using google-auth-library (service account)
// Supports SERVICE_ACCOUNT_JSON (raw JSON) or GOOGLE_APPLICATION_CREDENTIALS (file path / ADC).
async function getServiceAccountAccessToken() {
    try {
        const { GoogleAuth } = require('google-auth-library');

        // If raw JSON provided in env, use it directly
        if (process.env.SERVICE_ACCOUNT_JSON) {
            try {
                const cred = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
                const auth = new GoogleAuth({ credentials: cred, scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
                const client = await auth.getClient();
                const at = await client.getAccessToken();
                const token = (at && at.token) ? at.token : (typeof at === 'string' ? at : null);
                return token;
            } catch (e) {
                // fallthrough to try ADC if present
            }
        }

        // If GOOGLE_APPLICATION_CREDENTIALS path or default ADC available, use GoogleAuth default
        const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
        const client = await auth.getClient();
        const at = await client.getAccessToken();
        const token = (at && at.token) ? at.token : (typeof at === 'string' ? at : null);
        return token || null;
    } catch (e) {
        // return null on failure; caller will attempt other auth methods or surface a helpful error
        return null;
    }
}

// helper: try sending request either with key param or Authorization header
async function _postToGemini(body, useAuthHeader = false, useServiceAccountToken = false) {
    const urlBase = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText`;
    const url = useAuthHeader ? `${urlBase}` : `${urlBase}?key=${GEMINI_KEY}`;
    const headers = { 'Content-Type': 'application/json' };
    if (useAuthHeader) headers['Authorization'] = `Bearer ${GEMINI_KEY}`;
    // if explicitly asking to use service account token
    if (useServiceAccountToken) {
        const token = await getServiceAccountAccessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetcher(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
    });
    const js = await res.json().catch(() => null);
    return { res, js };
}

// REPLACE callGemini: try ?key, then auth header with API key, then service account token
async function callGemini(prompt) {
    if (!GEMINI_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.SERVICE_ACCOUNT_JSON) {
        const err = new Error('Gemini API key chưa cấu hình (GEMINI_API_KEY) và không có Service Account. Cấu hình 1 trong 2 để sử dụng Gemini.');
        err.status = 503;
        throw err;
    }
    const body = {
        prompt: { text: String(prompt || '').slice(0, 1200) },
        temperature: 0.2,
        candidateCount: 1,
        maxOutputTokens: 40
    };

    // 1) Try using ?key= first (if GEMINI_KEY present)
    let res, js;
    if (GEMINI_KEY) {
        let attempt = await _postToGemini(body, false);
        res = attempt.res; js = attempt.js;
        // if 401/403/404 or not ok, try header with API key next
        if (!res || !res.ok) {
            const second = await _postToGemini(body, true);
            res = second.res; js = second.js;
        }
    } else {
        res = null; js = null;
    }

    // 2) If still not ok, try service account token (if available)
    if (!res || !res.ok) {
        const saToken = await getServiceAccountAccessToken();
        if (saToken) {
            const third = await _postToGemini(body, false, true); // use service account token header
            res = third.res; js = third.js;
        }
    }

    // If still not ok -> normalize and throw
    if (!res || !res.ok) {
        const apiMsg = js && (js.error?.message || js.error) ? (js.error.message || js.error) : `Gemini API error (${res ? res.status : 'no response'})`;
        throw normalizeProviderError(apiMsg, res ? res.status : 502);
    }

    // parse response (unchanged)
    try {
        if (js && Array.isArray(js.candidates) && js.candidates[0]) {
            const cand = js.candidates[0];
            if (typeof cand.output === 'string' && cand.output.trim()) return cand.output.trim();
            if (Array.isArray(cand.content)) {
                const text = cand.content.map(c => c.text || '').join('').trim();
                if (text) return text;
            }
            if (cand.outputText) return String(cand.outputText).trim();
        }
        if (js && typeof js.output === 'string') return js.output.trim();
        if (js && js.choices && js.choices[0] && js.choices[0].content) return String(js.choices[0].content).trim();
    } catch (e) { /* fallthrough */ }

    const err = new Error('Không có kết quả hợp lệ từ Gemini.');
    err.status = 502;
    throw err;
}

// REPLACE testGeminiKey: try query, API key header, then service-account; include attemptedWith info
async function testGeminiKey(samplePrompt = 'Xin chào') {
    // quick check
    if (!GEMINI_KEY && !process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.SERVICE_ACCOUNT_JSON) {
        return {
            ok: false,
            error: 'No GEMINI_KEY and no Service Account configured',
            remediation: ['Set GEMINI_API_KEY or provide GOOGLE_APPLICATION_CREDENTIALS / SERVICE_ACCOUNT_JSON']
        };
    }

    const body = {
        prompt: { text: String(samplePrompt || 'Test').slice(0, 500) },
        temperature: 0.2,
        candidateCount: 1,
        maxOutputTokens: 20
    };

    let method = null;
    let res = null, js = null;

    // try ?key= if available
    if (GEMINI_KEY) {
        method = 'query';
        let attempt = await _postToGemini(body, false);
        res = attempt.res; js = attempt.js;
        if (!res || !res.ok) {
            method = 'api_key_header';
            const second = await _postToGemini(body, true);
            res = second.res; js = second.js;
        }
    }

    // try service account token if previous attempts failed
    if ((!res || !res.ok) && (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.SERVICE_ACCOUNT_JSON)) {
        method = 'service_account';
        const third = await _postToGemini(body, false, true);
        res = third.res; js = third.js;
    }

    if (!res || !res.ok) {
        const apiMsg = js && (js.error?.message || js.error) ? (js.error.message || js.error) : `HTTP ${res ? res.status : 'no response'}`;
        const remediation = [
            'Kiểm tra GEMINI_API_KEY trong .env (server) và restart server.',
            'Hoặc cấu hình Service Account: đặt GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json hoặc SERVICE_ACCOUNT_JSON với nội dung JSON của key.',
            'Vào Google Cloud Console → APIs & Services → bật "Generative Language API" cho project chứa key.',
            'Kiểm tra billing/quota và API key restrictions (IP/referrer).'
        ];
        return { ok: false, status: res ? res.status : null, apiMessage: apiMsg, raw: js || null, attemptedWith: method, remediation };
    }

    // success: extract text if possible
    let text = null;
    try {
        if (js && Array.isArray(js.candidates) && js.candidates[0]) {
            const cand = js.candidates[0];
            if (typeof cand.output === 'string' && cand.output.trim()) text = cand.output.trim();
            else if (Array.isArray(cand.content)) text = cand.content.map(c => c.text || '').join('').trim();
            else if (cand.outputText) text = String(cand.outputText).trim();
        } else if (js && typeof js.output === 'string') text = js.output.trim();
    } catch (e) { /* ignore parse errors */ }

    return { ok: true, status: res.status, raw: js, result: text || null, usedMethod: method, remediation: ['No remediation required if ok:true'] };
}

// REPLACE the getResponse implementation with the stricter Gemini-first behavior
exports.getResponse = async (prompt, { userId } = {}) => {
    if (!prompt) return '';

    // If forced to local, use local generator/model only
    if (env.FORCE_LOCAL_AI) {
        const localModelResp = await tryLocalModel(prompt).catch(() => null);
        const local = localModelResp || generateLocalSuggestion(prompt);
        if (AISuggestion && userId) {
            try { await AISuggestion.create({ user: userId, prompt: String(prompt).slice(0, 2000), result: String(local).slice(0, 5000) }); } catch (e) { console.warn('AISuggestion save failed', e); }
        }
        return enforceOneSentence(local, 200);
    }

    // If Gemini key present, always call Gemini and surface any provider errors (no silent fallback)
    if (GEMINI_KEY) {
        let result;
        try {
            result = await callGemini(prompt);
        } catch (e) {
            // DO NOT fallback to local here — surface the provider error so caller knows it's an AI provider issue
            throw e;
        }
        // ensure one concise sentence
        try { result = enforceOneSentence(result, 200); } catch (e) { /* noop */ }

        // persist suggestion (best-effort)
        if (AISuggestion && userId) {
            try { await AISuggestion.create({ user: userId, prompt: String(prompt).slice(0, 2000), result: String(result).slice(0, 5000) }); } catch (e) { console.warn('AISuggestion save failed', e); }
        }
        return result;
    }

    // No Gemini key -> try local model then local generator
    const localModelResp = await tryLocalModel(prompt).catch(() => null);
    const local = localModelResp || generateLocalSuggestion(prompt);
    try {
        const out = enforceOneSentence(local, 200);
        if (AISuggestion && userId) {
            try { await AISuggestion.create({ user: userId, prompt: String(prompt).slice(0, 2000), result: String(out).slice(0, 5000) }); } catch (e) { console.warn('AISuggestion save failed', e); }
        }
        return out;
    } catch (e) {
        return local;
    }
};

// export debug helper
exports.testGeminiKey = testGeminiKey;

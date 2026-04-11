// functions/index.js
// Cloud Functions for Firebase v2 (Node 20, asia-east1)
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { defineSecret } = require('firebase-functions/params')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const axios = require('axios')

initializeApp()

// ── 參數：從 Firebase Secret Manager 讀取 LINE Channel 憑證 ─────
// 部署前請先執行：
//   firebase functions:secrets:set LINE_CHANNEL_ID
//   firebase functions:secrets:set LINE_CHANNEL_SECRET
const LINE_CHANNEL_ID     = defineSecret('LINE_CHANNEL_ID')
const LINE_CHANNEL_SECRET = defineSecret('LINE_CHANNEL_SECRET')

// ────────────────────────────────────────────────────────────────
// lineLogin: 接收 LINE OAuth code，換取 Custom Token
// ────────────────────────────────────────────────────────────────
exports.lineLogin = onCall(
  {
    region: 'asia-east1',
    secrets: [LINE_CHANNEL_ID, LINE_CHANNEL_SECRET],
  },
  async (request) => {
    const { code, redirectUri } = request.data

    if (!code || !redirectUri) {
      throw new HttpsError('invalid-argument', '缺少 code 或 redirectUri')
    }

    // 1. 用 code 換取 LINE access_token + id_token
    let tokenRes
    try {
      tokenRes = await axios.post(
        'https://api.line.me/oauth2/v2.1/token',
        new URLSearchParams({
          grant_type:    'authorization_code',
          code,
          redirect_uri:  redirectUri,
          client_id:     LINE_CHANNEL_ID.value(),
          client_secret: LINE_CHANNEL_SECRET.value(),
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    } catch (e) {
      console.error('LINE token exchange failed:', e.response?.data ?? e.message)
      throw new HttpsError('unauthenticated', 'LINE 授權失敗')
    }

    const { access_token, id_token } = tokenRes.data

    // 2. 驗證 id_token 並取得使用者資料
    let verifyRes
    try {
      verifyRes = await axios.post(
        'https://api.line.me/oauth2/v2.1/verify',
        new URLSearchParams({
          id_token,
          client_id: LINE_CHANNEL_ID.value(),
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
    } catch (e) {
      throw new HttpsError('unauthenticated', 'LINE id_token 驗證失敗')
    }

    const { sub: lineUid, name, picture, email } = verifyRes.data

    // 3. 取得 LINE 使用者詳細資料（for photoURL）
    const profileRes = await axios.get('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    }).catch(() => ({ data: {} }))

    const displayName = name || profileRes.data.displayName || '使用者'
    const photoURL    = picture || profileRes.data.pictureUrl || ''

    // 4. 在 Firebase Auth 建立或更新使用者（用 lineUid 當 uid 前綴避免碰撞）
    const uid = `line:${lineUid}`
    const auth = getAuth()

    try {
      await auth.updateUser(uid, { displayName, photoURL, email: email || undefined })
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        await auth.createUser({ uid, displayName, photoURL, email: email || undefined })
      } else {
        throw e
      }
    }

    // 5. 確保 Firestore users 文件存在
    const db  = getFirestore()
    const ref = db.collection('users').doc(uid)
    const snap = await ref.get()
    if (!snap.exists) {
      await ref.set({
        uid,
        displayName,
        email:     email || '',
        photoURL,
        lineUid,
        role:      'pending',
        provider:  'line',
        createdAt: FieldValue.serverTimestamp(),
      })
    }

    // 6. 產生 Firebase Custom Token 回傳給前端
    const customToken = await auth.createCustomToken(uid)
    return { token: customToken }
  }
)

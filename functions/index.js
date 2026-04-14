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

// ── 共用函式：用 code 換取 LINE 使用者資料 ────────────────────
async function exchangeLineCode(code, redirectUri, channelId, channelSecret) {
  // 1. 換取 access_token + id_token
  let tokenRes
  try {
    tokenRes = await axios.post(
      'https://api.line.me/oauth2/v2.1/token',
      new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     channelId,
        client_secret: channelSecret,
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
      new URLSearchParams({ id_token, client_id: channelId }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    )
  } catch (e) {
    throw new HttpsError('unauthenticated', 'LINE id_token 驗證失敗')
  }

  const { sub: lineUid, name, picture, email } = verifyRes.data

  // 3. 取得詳細個人資料（photoURL）
  const profileRes = await axios.get('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${access_token}` },
  }).catch(() => ({ data: {} }))

  return {
    lineUid,
    displayName: name || profileRes.data.displayName || '使用者',
    photoURL:    picture || profileRes.data.pictureUrl || '',
    email:       email || '',
  }
}

// ────────────────────────────────────────────────────────────────
// lineLogin: 接收 LINE OAuth code，換取 Custom Token
// 支援 canonicalUid redirect（帳號已連結時回傳 Google uid 的 token）
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

    const { lineUid, displayName, photoURL, email } =
      await exchangeLineCode(code, redirectUri, LINE_CHANNEL_ID.value(), LINE_CHANNEL_SECRET.value())

    const db   = getFirestore()
    const auth = getAuth()

    // 查看是否有 redirect doc（表示此 LINE 帳號已連結至 Google 帳號）
    const lineDocRef = db.collection('users').doc(`line:${lineUid}`)
    const lineSnap   = await lineDocRef.get()

    let targetUid = `line:${lineUid}`

    if (lineSnap.exists && lineSnap.data().isRedirect && lineSnap.data().canonicalUid) {
      // 已連結：使用主帳號 uid（Google uid）建立 Custom Token
      targetUid = lineSnap.data().canonicalUid
    } else {
      // 未連結：建立或更新 Firebase Auth 使用者
      const uid = `line:${lineUid}`
      try {
        await auth.updateUser(uid, { displayName, photoURL, email: email || undefined })
      } catch (e) {
        if (e.code === 'auth/user-not-found') {
          await auth.createUser({ uid, displayName, photoURL, email: email || undefined })
        } else {
          throw e
        }
      }

      // 確保 Firestore users 文件存在
      if (!lineSnap.exists) {
        await lineDocRef.set({
          uid,
          displayName,
          email,
          photoURL,
          lineUid,
          role:      'pending',
          provider:  'line',
          createdAt: FieldValue.serverTimestamp(),
        })
      }
    }

    const customToken = await auth.createCustomToken(targetUid)
    return { token: customToken }
  }
)

// ────────────────────────────────────────────────────────────────
// linkLine: 將 LINE 帳號連結至現有帳號（Google → 連結 LINE）
// ────────────────────────────────────────────────────────────────
exports.linkLine = onCall(
  {
    region: 'asia-east1',
    secrets: [LINE_CHANNEL_ID, LINE_CHANNEL_SECRET],
  },
  async (request) => {
    const { code, redirectUri } = request.data
    const currentUid = request.auth?.uid || request.data.currentUid

    if (!code || !redirectUri || !currentUid) {
      throw new HttpsError('invalid-argument', '缺少必要參數 (code, redirectUri 或未登入)')
    }

    const { lineUid, displayName, photoURL } =
      await exchangeLineCode(code, redirectUri, LINE_CHANNEL_ID.value(), LINE_CHANNEL_SECRET.value())

    const db = getFirestore()

    // 在主帳號 doc 寫入 lineUid
    await db.collection('users').doc(currentUid).update({
      lineUid,
      linkedAt: FieldValue.serverTimestamp(),
    })

    // 建立 redirect doc（LINE uid → 主帳號 uid）
    await db.collection('users').doc(`line:${lineUid}`).set({
      canonicalUid: currentUid,
      isRedirect:   true,
      lineUid,
      displayName,
      photoURL,
      linkedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 回傳 Custom Token，讓前端可在 session 丟失後重新登入（解決 Safari session 問題）
    const auth = getAuth()
    const customToken = await auth.createCustomToken(currentUid)
    return { success: true, token: customToken }
  }
)

// ────────────────────────────────────────────────────────────────
// linkGoogle: 將 Google 帳號連結至現有 LINE 帳號（LINE → 連結 Google）
// 前端呼叫時機：使用者已完成 Google signInWithPopup，Auth 已切換至 Google
// ────────────────────────────────────────────────────────────────
exports.linkGoogle = onCall(
  {
    region: 'asia-east1',
  },
  async (request) => {
    // 優先使用 Firebase 驗證的身分
    const googleUid = request.auth?.uid || request.data.googleUid
    const lineUid   = request.data.lineUid

    if (!lineUid || !googleUid) {
      throw new HttpsError('invalid-argument', '缺少必要參數 (lineUid 或未登入)')
    }

    const db = getFirestore()

    // 取得 LINE doc 原有資料
    const lineDocRef = db.collection('users').doc(lineUid)
    const lineSnap   = await lineDocRef.get()

    if (!lineSnap.exists) {
      throw new HttpsError('not-found', '找不到 LINE 帳號資料')
    }

    const lineData = lineSnap.data()

    // 確保 Google doc 存在，若已存在則 merge；若不存在則將 LINE doc 資料遷移過去
    const googleDocRef = db.collection('users').doc(googleUid)
    const googleSnap   = await googleDocRef.get()

    // 無論 Google doc 是否已存在，都將 LINE 的完整資料 merge 進去
    // （避免 loadProfile 在 CF 執行前建立了僅含基本欄位的空白 doc）
    const { uid: _oldUid, provider: _oldProvider, isRedirect: _r, canonicalUid: _c, ...restData } = lineData
    await googleDocRef.set({
      ...restData,
      uid:      googleUid,
      provider: 'google.com',
      lineUid:  lineData.lineUid,
      linkedAt: FieldValue.serverTimestamp(),
    }, { merge: true })

    // 將 LINE doc 改為 redirect doc
    await lineDocRef.set({
      canonicalUid: googleUid,
      isRedirect:   true,
      lineUid:      lineData.lineUid,
      linkedAt:     FieldValue.serverTimestamp(),
    })

    return { success: true }
  }
)

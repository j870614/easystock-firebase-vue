// functions/index.js
// Cloud Functions for Firebase v2 (Node 20, asia-east1)
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server')

initializeApp()
const db = getFirestore()

const REGION = 'asia-east1'
const RP_NAME = '彌陀之家東林寺庫存管理系統'
const PASSKEY_REMINDER_DAYS = 14
const PASSKEY_SESSION_COLLECTION = 'webauthnSessions'
const CUSTOM_PASSKEY_ORIGINS = [
  'https://stock.donglinsys.org',
]

function getProjectId() {
  return process.env.GCLOUD_PROJECT || process.env.PROJECT_ID || 'easystock-firebase-vue'
}

function getFunctionOptions() {
  return {
    region: REGION,
    serviceAccount: `${getProjectId()}@appspot.gserviceaccount.com`,
  }
}

function getAllowedOrigins() {
  const projectId = getProjectId()
  return new Set([
    `https://${projectId}.firebaseapp.com`,
    `https://${projectId}.web.app`,
    ...CUSTOM_PASSKEY_ORIGINS,
    'http://localhost',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
  ])
}

function resolveOrigin(rawOrigin) {
  if (typeof rawOrigin !== 'string' || !rawOrigin) {
    throw new HttpsError('invalid-argument', '缺少來源網址。')
  }

  let normalized
  try {
    normalized = new URL(rawOrigin).origin
  } catch {
    throw new HttpsError('invalid-argument', '來源網址格式不正確。')
  }

  if (!getAllowedOrigins().has(normalized)) {
    throw new HttpsError('permission-denied', '此來源尚未允許使用 Passkey。')
  }

  return normalized
}

function resolveRpID(origin) {
  const hostname = new URL(origin).hostname
  if (hostname === 'localhost' || hostname === '127.0.0.1') return 'localhost'
  return hostname
}

function assertAuth(request) {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', '請先登入。')
  }
  return request.auth.uid
}

async function assertOwner(uid) {
  const { data: user } = await getUserRecord(uid)
  if (user.role !== 'owner') {
    throw new HttpsError('permission-denied', '只有系統總管可以處理裝置申請。')
  }
}

async function getUserRecord(uid) {
  const userRef = db.collection('users').doc(uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) {
    throw new HttpsError('not-found', '找不到使用者資料。')
  }
  return { ref: userRef, data: userSnap.data() }
}

async function listActivePasskeys(uid) {
  const snap = await db.collection('users').doc(uid).collection('passkeys').get()
  return snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((item) => !item.revokedAt)
}

async function saveChallenge(uid, payload) {
  await db.collection(PASSKEY_SESSION_COLLECTION).doc(uid).set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  })
}

async function readChallenge(uid, expectedType) {
  const snap = await db.collection(PASSKEY_SESSION_COLLECTION).doc(uid).get()
  if (!snap.exists) {
    throw new HttpsError('failed-precondition', '找不到待驗證的 Passkey 挑戰。')
  }
  const data = snap.data()
  if (data.type !== expectedType) {
    throw new HttpsError('failed-precondition', 'Passkey 驗證流程狀態不一致。')
  }
  return data
}

async function clearChallenge(uid) {
  await db.collection(PASSKEY_SESSION_COLLECTION).doc(uid).delete().catch(() => {})
}

function getDisplayName(user) {
  return user.dharmaName || user.secularName || user.displayName || '未命名使用者'
}

function normalizeDeviceLabel(value) {
  return String(value || '').trim().slice(0, 80) || '未命名裝置'
}

function serializeTimestamp(value) {
  if (!value) return null
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  return value
}

async function getApprovedDeviceRequest(uid, requestId) {
  if (!requestId) return null

  const requestRef = db
    .collection('users')
    .doc(uid)
    .collection('passkeyDeviceRequests')
    .doc(String(requestId))
  const requestSnap = await requestRef.get()
  if (!requestSnap.exists) {
    throw new HttpsError('failed-precondition', '找不到已核准的裝置申請。')
  }

  const data = requestSnap.data()
  if (data.status !== 'approved') {
    throw new HttpsError('failed-precondition', '此裝置申請尚未核准。')
  }

  return { ref: requestRef, data }
}

exports.createPasskeyDeviceRequest = onCall(getFunctionOptions(), async (request) => {
  const uid = assertAuth(request)
  const { data: user } = await getUserRecord(uid)
  const passkeys = await listActivePasskeys(uid)

  if (!passkeys.length) {
    return { ok: true, directEligible: true }
  }

  const deviceLabel = normalizeDeviceLabel(request.data?.deviceLabel)
  const deviceType = String(request.data?.deviceType || 'unknown').slice(0, 40)
  const origin = typeof request.data?.origin === 'string'
    ? request.data.origin.slice(0, 120)
    : ''
  const requestRef = db.collection('users').doc(uid).collection('passkeyDeviceRequests').doc()

  await requestRef.set({
    uid,
    userDisplayName: getDisplayName(user),
    email: user.email || '',
    photoURL: user.photoURL || '',
    deviceLabel,
    deviceType,
    origin,
    status: 'pending',
    createdAt: FieldValue.serverTimestamp(),
    decidedAt: null,
    decidedBy: null,
    usedAt: null,
  })

  return { ok: true, directEligible: false, requestId: requestRef.id }
})

exports.listPendingPasskeyDeviceRequests = onCall(getFunctionOptions(), async (request) => {
  const ownerUid = assertAuth(request)
  await assertOwner(ownerUid)

  const usersSnap = await db.collection('users').get()
  const requestSnaps = await Promise.all(
    usersSnap.docs.map((userDoc) =>
      userDoc.ref.collection('passkeyDeviceRequests').where('status', '==', 'pending').get()
    )
  )

  const requests = requestSnaps
    .flatMap((snap) => snap.docs)
    .map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        uid: data.uid || doc.ref.parent.parent?.id || '',
        userDisplayName: data.userDisplayName || '',
        email: data.email || '',
        photoURL: data.photoURL || '',
        deviceLabel: data.deviceLabel || '',
        deviceType: data.deviceType || '',
        origin: data.origin || '',
        status: data.status || '',
        createdAt: serializeTimestamp(data.createdAt),
      }
    })
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))

  return { ok: true, requests }
})

exports.reviewPasskeyDeviceRequest = onCall(getFunctionOptions(), async (request) => {
  const ownerUid = assertAuth(request)
  await assertOwner(ownerUid)

  const uid = String(request.data?.uid || '')
  const requestId = String(request.data?.requestId || '')
  const action = String(request.data?.action || '')

  if (!uid || !requestId || !['approve', 'reject'].includes(action)) {
    throw new HttpsError('invalid-argument', '裝置申請參數不完整。')
  }

  const requestRef = db.collection('users').doc(uid).collection('passkeyDeviceRequests').doc(requestId)
  await db.runTransaction(async (transaction) => {
    const snap = await transaction.get(requestRef)
    if (!snap.exists) {
      throw new HttpsError('not-found', '找不到裝置申請。')
    }
    if (snap.data().status !== 'pending') {
      throw new HttpsError('failed-precondition', '此裝置申請已處理。')
    }

    transaction.set(requestRef, {
      status: action === 'approve' ? 'approved' : 'rejected',
      decidedAt: FieldValue.serverTimestamp(),
      decidedBy: ownerUid,
    }, { merge: true })
  })

  return { ok: true }
})

exports.createPasskeyRegistrationOptions = onCall(getFunctionOptions(), async (request) => {
  const uid = assertAuth(request)
  const origin = resolveOrigin(request.data?.origin)
  const rpID = resolveRpID(origin)
  const { data: user } = await getUserRecord(uid)
  const passkeys = await listActivePasskeys(uid)
  const deviceRequestId = String(request.data?.deviceRequestId || '')

  if (passkeys.length > 0) {
    await getApprovedDeviceRequest(uid, deviceRequestId)
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID,
    userName: user.email || uid,
    userDisplayName: user.displayName || user.secularName || user.dharmaName || '未命名使用者',
    userID: Buffer.from(uid, 'utf8'),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'required',
    },
    excludeCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId || passkey.id,
      transports: Array.isArray(passkey.transports) ? passkey.transports : [],
    })),
  })

  await saveChallenge(uid, {
    type: 'registration',
    challenge: options.challenge,
    origin,
    rpID,
    deviceRequestId: deviceRequestId || null,
  })

  return options
})

exports.verifyPasskeyRegistration = onCall(getFunctionOptions(), async (request) => {
  const uid = assertAuth(request)
  const challenge = await readChallenge(uid, 'registration')
  const response = request.data?.response
  const requestedDeviceLabel = normalizeDeviceLabel(request.data?.deviceLabel)
  const { ref: userRef } = await getUserRecord(uid)
  const passkeys = await listActivePasskeys(uid)
  const deviceRequest = passkeys.length > 0
    ? await getApprovedDeviceRequest(uid, challenge.deviceRequestId)
    : null
  const deviceLabel = deviceRequest?.data?.deviceLabel || requestedDeviceLabel

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpID,
      requireUserVerification: true,
    })
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message || 'Passkey 綁定驗證失敗。')
  }

  const { verified, registrationInfo } = verification
  if (!verified || !registrationInfo) {
    throw new HttpsError('invalid-argument', 'Passkey 綁定驗證失敗。')
  }

  const passkeyRef = userRef.collection('passkeys').doc(registrationInfo.credential.id)
  const passkeyPayload = {
    credentialId: registrationInfo.credential.id,
    publicKey: registrationInfo.credential.publicKey,
    counter: registrationInfo.credential.counter,
    transports: registrationInfo.credential.transports || [],
    deviceType: registrationInfo.credentialDeviceType,
    backedUp: registrationInfo.credentialBackedUp,
    deviceLabel,
    createdAt: FieldValue.serverTimestamp(),
    lastUsedAt: FieldValue.serverTimestamp(),
    revokedAt: null,
  }
  const userSecurityPayload = {
    security: {
      passkeyEnrolled: true,
      passkeyEnrolledAt: FieldValue.serverTimestamp(),
      passkeyGraceUntil: null,
      passkeyLastVerifiedAt: FieldValue.serverTimestamp(),
      passkeyRecoveryRequired: false,
    },
  }

  if (deviceRequest) {
    await db.runTransaction(async (transaction) => {
      const requestSnap = await transaction.get(deviceRequest.ref)
      if (!requestSnap.exists || requestSnap.data().status !== 'approved') {
        throw new HttpsError('failed-precondition', '此裝置申請已被使用或尚未核准。')
      }

      transaction.set(passkeyRef, passkeyPayload)
      transaction.set(userRef, userSecurityPayload, { merge: true })
      transaction.set(deviceRequest.ref, {
        status: 'used',
        usedAt: FieldValue.serverTimestamp(),
      }, { merge: true })
    })
  } else {
    const batch = db.batch()
    batch.set(passkeyRef, passkeyPayload)
    batch.set(userRef, userSecurityPayload, { merge: true })
    await batch.commit()
  }

  await clearChallenge(uid)
  return { verified: true, deviceRequestUsed: !!deviceRequest }
})

exports.createPasskeyAuthenticationOptions = onCall(getFunctionOptions(), async (request) => {
  const uid = assertAuth(request)
  const origin = resolveOrigin(request.data?.origin)
  const rpID = resolveRpID(origin)
  const passkeys = await listActivePasskeys(uid)

  if (!passkeys.length) {
    throw new HttpsError('failed-precondition', '此帳號尚未綁定 Passkey。')
  }

  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'required',
    allowCredentials: passkeys.map((passkey) => ({
      id: passkey.credentialId || passkey.id,
      transports: Array.isArray(passkey.transports) ? passkey.transports : [],
    })),
  })

  await saveChallenge(uid, {
    type: 'authentication',
    challenge: options.challenge,
    origin,
    rpID,
  })

  return options
})

exports.verifyPasskeyAuthentication = onCall(getFunctionOptions(), async (request) => {
  const uid = assertAuth(request)
  const challenge = await readChallenge(uid, 'authentication')
  const response = request.data?.response
  const credentialId = response?.id

  if (!credentialId) {
    throw new HttpsError('invalid-argument', '缺少 Passkey 憑證 ID。')
  }

  const passkeyRef = db.collection('users').doc(uid).collection('passkeys').doc(credentialId)
  const passkeySnap = await passkeyRef.get()
  if (!passkeySnap.exists) {
    throw new HttpsError('not-found', '找不到這組 Passkey。')
  }

  const passkey = passkeySnap.data()
  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge.challenge,
      expectedOrigin: challenge.origin,
      expectedRPID: challenge.rpID,
      credential: {
        id: passkey.credentialId || credentialId,
        publicKey: passkey.publicKey,
        counter: Number(passkey.counter || 0),
        transports: Array.isArray(passkey.transports) ? passkey.transports : [],
      },
      requireUserVerification: true,
    })
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message || 'Passkey 驗證失敗。')
  }

  const { verified, authenticationInfo } = verification
  if (!verified || !authenticationInfo) {
    throw new HttpsError('invalid-argument', 'Passkey 驗證失敗。')
  }

  await passkeyRef.set({
    counter: authenticationInfo.newCounter,
    lastUsedAt: FieldValue.serverTimestamp(),
  }, { merge: true })

  await db.collection('users').doc(uid).set({
    security: {
      passkeyEnrolled: true,
      passkeyLastVerifiedAt: FieldValue.serverTimestamp(),
      passkeyRecoveryRequired: false,
    },
  }, { merge: true })

  await clearChallenge(uid)
  return { verified: true }
})

exports.deferPasskeyEnrollment = onCall(getFunctionOptions(), async (request) => {
  const uid = assertAuth(request)
  const days = Math.max(1, Math.min(30, Number(request.data?.days || PASSKEY_REMINDER_DAYS)))
  const { ref: userRef, data: user } = await getUserRecord(uid)

  if (user?.security?.passkeyRequiredFrom) {
    throw new HttpsError('failed-precondition', '此帳號目前需要先完成 Passkey 綁定。')
  }

  const graceUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  await userRef.set({
    security: {
      passkeyGraceUntil: graceUntil,
    },
  }, { merge: true })

  return { ok: true }
})

// 目前系統已回歸為純 Google 認證架構，
// 如未來需新增雲端函式，請在此處導出。

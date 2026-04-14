// functions/index.js
// Cloud Functions for Firebase v2 (Node 20, asia-east1)
const { onCall, HttpsError } = require('firebase-functions/v2/https')
const { initializeApp } = require('firebase-admin/app')
const { getAuth } = require('firebase-admin/auth')
const { getFirestore, FieldValue } = require('firebase-admin/firestore')

initializeApp()

// 目前系統已回歸為純 Google 認證架構，
// 如未來需新增雲端函式，請在此處導出。

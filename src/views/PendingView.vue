<template>
  <div class="min-h-dvh bg-stock-bg flex flex-col items-center justify-center px-6 text-center">
    <!-- 未填寫個資時顯示表單 -->
    <template v-if="needsProfile">
      <div class="w-20 h-20 bg-brand-100 rounded-full flex items-center justify-center mb-6">
        <UserPlus class="w-10 h-10 text-brand-500" />
      </div>
      <h1 class="text-2xl font-bold text-gray-800 mb-3">完善使用者資訊</h1>
      <p class="text-gray-500 leading-relaxed mb-6">
        請填寫法名或俗名（擇一），並選擇執事，<br />
        以便管理員辨識並開通權限。
      </p>

      <div class="card w-full max-w-sm text-left mb-6 space-y-4">
        <div>
          <label class="label">法名</label>
          <input v-model="form.dharmaName" type="text" class="input" placeholder="例如：普某" />
        </div>
        <div>
          <label class="label">俗名</label>
          <input v-model="form.secularName" type="text" class="input" placeholder="真實姓名" />
        </div>
        <p class="text-xs text-amber-600 font-medium">※ 法名與俗名請擇一填寫，以便管理員進行審核。</p>

        <div>
          <label class="label">執事 <span class="text-red-500">*</span></label>
          <el-select
            v-model="form.dutyId"
            class="w-full"
            placeholder="請選擇執事"
            :loading="dutiesLoading"
          >
            <el-option
              v-for="d in appStore.activeDuties"
              :key="d.id"
              :label="d.name"
              :value="d.id"
            />
          </el-select>
        </div>

        <button
          class="btn-primary w-full mt-2"
          :disabled="submitting || (!form.dharmaName.trim() && !form.secularName.trim()) || !form.dutyId"
          @click="submitProfile"
        >
          <span v-if="submitting">送出中...</span>
          <span v-else>確認送出</span>
        </button>
      </div>
    </template>

    <!-- 已填寫，等待審核 -->
    <template v-else>
      <div class="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
        <Clock class="w-10 h-10 text-amber-500" />
      </div>
      <h1 class="text-2xl font-bold text-gray-800 mb-3">帳號審核中</h1>
      <p class="text-gray-500 leading-relaxed mb-8">
        您的帳號已建立，<br />
        請等候系統管理員開通使用權限。<br />
        <span class="text-sm mt-2 inline-block">開通後請重新整理或重新登入。</span>
      </p>

      <div class="card w-full max-w-sm text-left mb-6">
        <div class="flex items-center gap-3">
          <img
            :src="authStore.user?.photoURL || ''"
            class="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0"
            :alt="authStore.user?.displayName || '使用者'"
          />
          <div>
            <div class="font-semibold text-gray-800">
              <span v-if="authStore.profile?.dharmaName">{{ authStore.profile.dharmaName }}<span v-if="authStore.profile?.secularName">（{{ authStore.profile.secularName }}）</span></span>
              <span v-else-if="authStore.profile?.secularName">{{ authStore.profile.secularName }}</span>
              <span v-else>{{ authStore.user?.displayName }}</span>
            </div>
            <div v-if="authStore.profile?.dutyName" class="text-sm text-purple-600 mt-0.5">{{ authStore.profile.dutyName }}</div>
            <div class="text-sm text-gray-500">{{ authStore.user?.email }}</div>
            <span class="badge-role-pending mt-1">待審核</span>
          </div>
        </div>
      </div>
    </template>

    <button class="btn-ghost" @click="authStore.signOut()">
      <LogOut class="w-5 h-5" /> 登出
    </button>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, LogOut, UserPlus } from 'lucide-vue-next'
import { doc, updateDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { ElMessage } from 'element-plus'
import { db } from '@/firebase'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'

const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()

const submitting = ref(false)
const dutiesLoading = ref(true)
const form = ref({
  dharmaName: '',
  secularName: '',
  dutyId: ''
})

onMounted(async () => {
  appStore.init()
  // 等待第一次 duties 資料
  if (appStore.duties.length === 0) {
    const unwatch = watch(() => appStore.duties.length, (len) => {
      if (len > 0) {
        dutiesLoading.value = false
        unwatch()
      }
    })
    // 若 1 秒內無資料也關掉 loading
    setTimeout(() => { dutiesLoading.value = false }, 1000)
  } else {
    dutiesLoading.value = false
  }
})

const needsProfile = computed(() => {
  if (!authStore.profile) return false
  return !authStore.profile.secularName && !authStore.profile.dharmaName && !authStore.profile.profileSubmitted
})

async function submitProfile() {
  submitting.value = true
  try {
    const duty = appStore.activeDuties.find(d => d.id === form.value.dutyId)
    const userRef = doc(db, 'users', authStore.user.uid)
    await updateDoc(userRef, {
      dharmaName: form.value.dharmaName.trim(),
      secularName: form.value.secularName.trim(),
      dutyId: form.value.dutyId,
      dutyName: duty?.name || '',
      profileSubmitted: true
    })
  } catch (err) {
    console.error('更新個資失敗', err)
    ElMessage.error('更新失敗，請再試一次')
  } finally {
    submitting.value = false
  }
}

// 即時監控：如果角色變更為非 pending，自動導回首頁
watch(() => authStore.isPending, (isPending) => {
  if (!isPending && authStore.isAuthenticated) {
    router.push(authStore.getPostLoginRoute())
  }
}, { immediate: true })
</script>

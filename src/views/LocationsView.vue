<template>
  <AppLayout title="道場管理" :show-location-picker="false">
    <div class="flex justify-end mb-4">
      <button class="btn-primary gap-2 text-base" @click="openForm()">
        <Plus class="w-5 h-5" /> 新增道場
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <div class="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <div v-else class="space-y-2 pb-24">
      <VueDraggable
        v-model="draggableLocations"
        item-key="id"
        handle=".drag-loc-handle"
        @end="onDragEnd"
        class="space-y-2"
        ghost-class="opacity-50"
      >
        <template #item="{ element: loc }">
          <div
            class="card flex items-center gap-3"
            :class="!loc.isActive ? 'opacity-50' : ''"
          >
            <button class="drag-loc-handle p-2 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0">
              <GripVertical class="w-5 h-5" />
            </button>
            <Building2 class="w-8 h-8 text-brand-400 flex-shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-gray-800">{{ loc.name }}</div>
              <div v-if="loc.address" class="text-sm text-gray-400 truncate">{{ loc.address }}</div>
            </div>
            <el-switch :model-value="loc.isActive" @change="(val) => toggleActive(loc, val)" />
            <button class="p-2 rounded-xl hover:bg-gray-100" @click="openForm(loc)">
              <Pencil class="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </template>
      </VueDraggable>
    </div>

    <el-dialog v-model="dialogVisible" :title="editingId ? '編輯道場' : '新增道場'" width="92%" align-center>
      <div class="space-y-4 py-2">
        <div>
          <label class="label">道場名稱 *</label>
          <input v-model="form.name" type="text" class="input" placeholder="例如：本會道場" />
        </div>
        <div>
          <label class="label">國度 (地區定價用) *</label>
          <input v-model="form.country" type="text" class="input" placeholder="例如：台灣" />
        </div>
        <div>
          <label class="label">地址（選填）</label>
          <div class="flex gap-2">
            <input v-model="form.address" type="text" class="input" placeholder="例如：香港XX區XX路XX號" />
            <button 
              class="btn-ghost px-3 shrink-0" 
              :disabled="!form.address || geocoding" 
              @click="getLocationFromAddress"
              title="從地址獲取經緯度"
            >
              <div v-if="geocoding" class="w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
              <Search v-else class="w-4 h-4" />
            </button>
          </div>
        </div>
        <div class="pt-2 border-t mt-4">
          <div class="flex items-center justify-between mb-2">
            <label class="label mb-0">地理座標（定位驗證用）</label>
            <button class="text-brand-600 text-sm flex items-center gap-1 font-semibold hover:text-brand-700" @click="getLocation">
              <MapPin class="w-4 h-4" /> 獲取位置
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-500 block mb-1">緯度 (Lat)</label>
              <input v-model.number="form.lat" type="number" class="input py-2 text-sm" placeholder="例如：25.033" />
            </div>
            <div>
              <label class="text-xs text-gray-500 block mb-1">經度 (Lng)</label>
              <input v-model.number="form.lng" type="number" class="input py-2 text-sm" placeholder="例如：121.565" />
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-1">設定座標後，一般成員登入系統時必須在此座標半徑 200 公尺內。</p>
        </div>
      </div>
      <template #footer>
        <button class="btn-ghost mr-2" @click="dialogVisible = false">取消</button>
        <button class="btn-primary" :disabled="!form.name || saving" @click="save">
          {{ saving ? '儲存中…' : '儲存' }}
        </button>
      </template>
    </el-dialog>
  </AppLayout>
</template>

<script setup>
import { ref, watch } from 'vue'
import { collection, addDoc, updateDoc, doc, writeBatch } from 'firebase/firestore'
import { Plus, Pencil, Building2, GripVertical, MapPin, Search } from 'lucide-vue-next'
import { db } from '@/firebase'
import { useAppStore } from '@/stores/app'
import AppLayout from '@/components/AppLayout.vue'
import VueDraggable from 'vuedraggable'

const appStore = useAppStore()
const loading    = ref(false)
const saving     = ref(false)
const geocoding  = ref(false)
const dialogVisible = ref(false)
const editingId  = ref(null)
const draggableLocations = ref([])

watch(() => appStore.locations, (newVal) => {
  draggableLocations.value = [...newVal].sort((a, b) => (a.order || 0) - (b.order || 0))
}, { immediate: true })

const form = ref({ name: '', country: '台灣', address: '', lat: null, lng: null, isActive: true })

function openForm(loc = null) {
  editingId.value = loc?.id ?? null
  form.value = loc
    ? { name: loc.name, country: loc.country || '台灣', address: loc.address ?? '', lat: loc.lat ?? null, lng: loc.lng ?? null, isActive: loc.isActive }
    : { name: '', country: '台灣', address: '', lat: null, lng: null, isActive: true }
  geocoding.value = false
  dialogVisible.value = true
}

function getLocation() {
  if (!navigator.geolocation) {
    alert('您的瀏覽器不支援地理定位');
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.value.lat = position.coords.latitude;
      form.value.lng = position.coords.longitude;
    },
    (error) => {
      alert('無法獲取位置：' + error.message);
    },
    { enableHighAccuracy: true }
  );
}

async function getLocationFromAddress() {
  if (!form.value.address) return
  
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    alert('系統未設定 Google Maps API 金鑰，無法使用此功能。')
    return
  }

  geocoding.value = true
  try {
    // 1. 確保載入 Google Maps SDK (前端 SDK 支援網域限制)
    await loadGoogleMapsScript(apiKey)
    
    // 2. 使用 SDK 的 Geocoder
    const geocoder = new window.google.maps.Geocoder()
    geocoder.geocode({ 
      address: form.value.address,
      language: 'zh-TW',
      region: 'tw'
    }, (results, status) => {
      geocoding.value = false
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location
        form.value.lat = location.lat()
        form.value.lng = location.lng()
      } else if (status === 'ZERO_RESULTS') {
        alert('找不到該地址的座標，請確認地址是否正確。')
      } else {
        console.error('Geocoder failed:', status)
        alert(`定位失敗 (${status})，請確認金鑰是否已啟用 Geocoding API 並允許目前的網域。`)
      }
    })
  } catch (err) {
    console.error('Load SDK error:', err)
    alert('載入地圖元件失敗，請檢查網路連線或金鑰設定。')
    geocoding.value = false
  }
}

// 動態載入 Google Maps Script 的輔助函式
function loadGoogleMapsScript(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google && window.google.maps) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

async function save() {
  saving.value = true
  try {
    const data = { ...form.value }
    if (editingId.value) {
      await updateDoc(doc(db, 'locations', editingId.value), data)
    } else {
      const maxOrder = Math.max(0, ...appStore.locations.map(l => l.order || 0))
      data.order = maxOrder + 10
      await addDoc(collection(db, 'locations'), data)
    }
    dialogVisible.value = false
  } finally {
    saving.value = false
  }
}

async function toggleActive(loc, val) {
  loc.isActive = val
  await updateDoc(doc(db, 'locations', loc.id), { isActive: val })
}

async function onDragEnd() {
  try {
    const batch = writeBatch(db)
    draggableLocations.value.forEach((loc, index) => {
      const newOrder = (index + 1) * 10
      if (loc.order !== newOrder) {
        loc.order = newOrder
        batch.update(doc(db, 'locations', loc.id), { order: newOrder })
      }
    })
    await batch.commit()
  } catch(e) {
    console.error('更新道場排序失敗', e)
  }
}
</script>

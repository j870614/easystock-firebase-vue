<template>
  <router-view v-slot="{ Component }">
    <transition name="fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
// App.vue 只負責渲染路由出口與全域過渡動畫
// 所有頁面邏輯在各 View 元件中
</script>

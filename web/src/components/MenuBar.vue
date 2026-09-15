<template>
  <nav class="menu-bar">
    <div class="menu-items">
      <div
        v-for="menu in menus"
        :key="menu.id"
        class="menu-item"
        @mouseenter="showSubMenu(menu.id)"
        @mouseleave="hideSubMenu(menu.id)"
      >
        <button
          @click="$emit('select', menu)"
          :class="{active: menu.id === activeId}"
          :aria-current="menu.id === activeId ? 'page' : undefined"
          :aria-label="menu.name"
        >
          <span class="menu-label" aria-hidden="true">
            <span
              v-for="(char, index) in getGraphemes(menu.name)"
              :key="`${menu.id}-${index}`"
              class="menu-char"
              :style="{ '--char-delay': `${index * 25}ms` }"
            >{{ char === ' ' ? '\u00a0' : char }}</span>
          </span>
        </button>

        <div
          v-if="menu.subMenus && menu.subMenus.length > 0"
          class="sub-menu"
          :class="{ show: hoveredMenuId === menu.id }"
        >
          <button
            v-for="subMenu in menu.subMenus"
            :key="subMenu.id"
            @click="$emit('select', subMenu, menu)"
            :class="{active: subMenu.id === activeSubMenuId}"
            class="sub-menu-item"
          >
            {{ subMenu.name }}
          </button>
        </div>
      </div>
    </div>
    <div v-if="selectedMenu?.subMenus?.length" class="mobile-sub-menu" :aria-label="`${selectedMenu.name} 子分类`">
      <button
        v-for="subMenu in selectedMenu.subMenus"
        :key="subMenu.id"
        class="mobile-sub-menu-item"
        :class="{active: subMenu.id === activeSubMenuId}"
        @click="$emit('select', subMenu, selectedMenu)"
      >
        {{ subMenu.name }}
      </button>
    </div>
  </nav>
</template>

<script setup>
import { computed, ref } from 'vue';

const props = defineProps({ 
  menus: Array, 
  activeId: Number,
  activeSubMenuId: Number 
});

const hoveredMenuId = ref(null);
const selectedMenu = computed(() => props.menus?.find((menu) => menu.id === props.activeId));
const graphemeCache = new Map();
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('zh', { granularity: 'grapheme' })
  : null;

function getGraphemes(text) {
  if (!graphemeCache.has(text)) {
    graphemeCache.set(text, segmenter
      ? Array.from(segmenter.segment(text), ({ segment }) => segment)
      : Array.from(text));
  }
  return graphemeCache.get(text);
}

function showSubMenu(menuId) {
  hoveredMenuId.value = menuId;
}

function hideSubMenu(menuId) {
  // 延迟隐藏，给用户时间移动到子菜单
  setTimeout(() => {
    if (hoveredMenuId.value === menuId) {
      hoveredMenuId.value = null;
    }
  }, 100);
}
</script>

<style scoped>
.menu-bar {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  padding: 0 1rem;
  position: relative;
}

.menu-items {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  width: 100%;
}

.menu-item {
  position: relative;
}

.menu-bar button {
  background: transparent;
  border: none;
  color: #fff;
  font-size: 16px;
  font-weight: 500;
  padding: 0.8rem 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  box-shadow: none;
  border-radius: 8px;
  position: relative;
  overflow: hidden;
}

.menu-label {
  display: inline-flex;
  position: relative;
  height: 1em;
  line-height: 1;
  overflow: hidden;
  vertical-align: middle;
}

.menu-char {
  display: inline-block;
  position: relative;
  will-change: transform;
  text-shadow: 0 1em currentColor;
  transition: transform 250ms ease-in-out;
  transition-delay: var(--char-delay);
}

.menu-bar button:hover .menu-char,
.menu-bar button:focus-visible .menu-char {
  transform: translateY(-1em);
}

.menu-bar button::before {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  width: 0;
  height: 2px;
  background: #399dff;
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.menu-bar button:hover {
  color: #399dff;
  transform: translateY(-1px);
}

.menu-bar button.active {
  color: #399dff;
}

.menu-bar button.active::before {
  width: 60%;
}

/* 二级菜单样式 */
.sub-menu {
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #5c595900;
  backdrop-filter: blur(8px);
  border-radius: 6px;
  min-width: 120px;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  margin-top: -2px; 
}

.sub-menu.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(2px);
}

.sub-menu-item {
  display: block !important;
  width: 100% !important;
  text-align: center !important;
  padding: 0.4rem 1rem !important;
  border: none !important;
  background: transparent !important;
  color: #fff !important;
  font-size: 14px !important;
  font-weight: 400 !important;
  cursor: pointer !important;
  transition: all 0.2s ease !important;
  border-radius: 0 !important;
  text-shadow: none !important;
  line-height: 1.5 !important;
}

.sub-menu-item:hover {
  background: rgba(57, 157, 255, 0.25) !important;
  color: #399dff !important;
  transform: none !important;
}

.sub-menu-item.active {
  background: rgba(57, 157, 255, 0.35) !important;
  color: #399dff !important;
  font-weight: 500 !important;
}

.sub-menu-item::before {
  display: none;
}

.mobile-sub-menu {
  display: none;
}

@media (max-width: 768px) {
  .menu-bar {
    display: block;
    padding: 0 10px;
  }

  .menu-items,
  .mobile-sub-menu {
    display: flex;
    justify-content: flex-start;
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .menu-items::-webkit-scrollbar,
  .mobile-sub-menu::-webkit-scrollbar {
    display: none;
  }

  .menu-item {
    flex: none;
  }

  .menu-bar button {
    font-size: 14px;
    min-height: 44px;
    padding: 0 12px;
    white-space: nowrap;
  }

  .mobile-sub-menu {
    background: rgba(15, 23, 42, 0.32);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    border-top: 1px solid rgba(255, 255, 255, 0.12);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  }

  .mobile-sub-menu-item {
    flex: none;
    min-height: 40px !important;
    font-size: 13px !important;
    padding: 0 12px !important;
  }

  .mobile-sub-menu-item.active {
    color: #399dff;
  }

  .sub-menu {
    display: none;
  }
}
</style> 

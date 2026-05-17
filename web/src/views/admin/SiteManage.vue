<template>
  <div class="site-manage">
    <section class="site-panel">
      <div class="panel-header">
        <div>
          <h3 class="section-title">站点设置</h3>
          <p class="section-desc">背景图和站点 Logo 支持填写图床直链。</p>
        </div>
        <button class="btn" type="button" @click="saveSettings" :disabled="saving">
          {{ saving ? '保存中...' : '保存设置' }}
        </button>
      </div>

      <div class="form-grid">
        <label class="form-field">
          <span>站点名称</span>
          <input v-model="form.site_name" class="input" placeholder="Nav-Item" />
        </label>
        <label class="form-field">
          <span>站点 Logo / Favicon</span>
          <input v-model="form.site_logo_url" class="input" placeholder="https://..." />
        </label>
        <label class="form-field form-field-wide">
          <span>背景图链接</span>
          <input v-model="form.background_url" class="input" placeholder="https://..." />
        </label>
      </div>

      <div class="preview-row">
        <div class="logo-preview">
          <img v-if="form.site_logo_url" :src="form.site_logo_url" alt="site logo preview" />
          <span v-else>Logo</span>
        </div>
        <div class="background-preview" :style="backgroundPreviewStyle">
          <span>背景图预览</span>
        </div>
      </div>
    </section>

    <section class="site-panel">
      <div class="panel-header">
        <div>
          <h3 class="section-title">Umami 统计</h3>
          <p class="section-desc">展示分享页可读取的累计访问量和访客数。</p>
        </div>
        <button class="btn secondary-btn" type="button" @click="loadStats" :disabled="statsLoading">
          {{ statsLoading ? '刷新中...' : '刷新统计' }}
        </button>
      </div>

      <div class="form-grid">
        <label class="form-field">
          <span>Umami 地址</span>
          <input v-model="form.umami_base_url" class="input" placeholder="https://u.mtcacg.top" />
        </label>
        <label class="form-field">
          <span>Website ID</span>
          <input v-model="form.umami_website_id" class="input" placeholder="c16beeaa-..." />
        </label>
        <label class="form-field form-field-wide">
          <span>分享链接</span>
          <div class="link-input-row">
            <input v-model="form.umami_share_url" class="input" placeholder="https://u.mtcacg.top/share/..." />
            <a
              class="link-btn"
              :href="safeShareUrl"
              target="_blank"
              rel="noopener noreferrer"
              :class="{ disabled: !safeShareUrl }"
              @click="handleShareLinkClick"
            >
              打开
            </a>
          </div>
        </label>
      </div>

      <div class="stats-grid">
        <div class="stat-box">
          <span class="stat-label">累计访问量</span>
          <strong>{{ formatNumber(stats.pageviews) }}</strong>
        </div>
        <div class="stat-box">
          <span class="stat-label">访客数</span>
          <strong>{{ formatNumber(stats.visitors) }}</strong>
        </div>
      </div>
    </section>

    <p v-if="message" :class="['message', messageType]">{{ message }}</p>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { getSiteSettings, updateSiteSettings, getUmamiStats } from '../../api';

const form = reactive({
  site_name: '',
  site_logo_url: '',
  background_url: '',
  umami_base_url: '',
  umami_website_id: '',
  umami_share_url: '',
});
const stats = reactive({
  pageviews: 0,
  visitors: 0,
});
const saving = ref(false);
const statsLoading = ref(false);
const message = ref('');
const messageType = ref('success');

const backgroundPreviewStyle = computed(() => {
  if (!form.background_url) return {};
  return { backgroundImage: `url(${JSON.stringify(form.background_url)})` };
});
const safeShareUrl = computed(() => normalizeHttpUrl(form.umami_share_url));

onMounted(async () => {
  await loadSettings();
  await loadStats();
});

async function loadSettings() {
  try {
    const res = await getSiteSettings();
    Object.assign(form, res.data || {});
  } catch (error) {
    showMessage('站点设置加载失败', 'error');
  }
}

async function saveSettings() {
  saving.value = true;
  try {
    const res = await updateSiteSettings({ ...form });
    Object.assign(form, res.data || {});
    applySiteSettings();
    showMessage('站点设置已保存', 'success');
    await loadStats();
  } catch (error) {
    showMessage(error.response?.data?.error || '站点设置保存失败', 'error');
  } finally {
    saving.value = false;
  }
}

async function loadStats() {
  statsLoading.value = true;
  try {
    const res = await getUmamiStats();
    stats.pageviews = res.data?.pageviews || 0;
    stats.visitors = res.data?.visitors || 0;
  } catch (error) {
    showMessage(error.response?.data?.error || 'Umami 统计加载失败', 'error');
  } finally {
    statsLoading.value = false;
  }
}

function applySiteSettings() {
  if (form.site_name) document.title = form.site_name;
  if (form.background_url) {
    document.documentElement.style.setProperty(
      '--nav-background-image',
      `url(${JSON.stringify(form.background_url)})`,
    );
  }
  if (form.site_logo_url) {
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = form.site_logo_url;
  }
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('zh-CN');
}

function normalizeHttpUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  return '';
}

function handleShareLinkClick(event) {
  if (!safeShareUrl.value) {
    event.preventDefault();
    showMessage('请先填写完整的分享链接', 'error');
  }
}

function showMessage(text, type) {
  message.value = text;
  messageType.value = type;
  setTimeout(() => {
    message.value = '';
  }, 3000);
}
</script>

<style scoped>
.site-manage {
  width: 90%;
  max-width: 1120px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.site-panel {
  background: #fff;
  border: 1px solid #e3e6ef;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  padding: 24px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-title {
  margin: 0 0 6px 0;
  color: #2566d8;
  font-size: 1.25rem;
}

.section-desc {
  margin: 0;
  color: #64748b;
  font-size: 14px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #222;
  font-weight: 500;
}

.form-field-wide {
  grid-column: 1 / -1;
}

.input {
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #d0d7e2;
  background: #fff;
  color: #222;
  font-size: 15px;
}

.input:focus {
  outline: 2px solid #2566d8;
  border-color: #2566d8;
}

.link-input-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 8px;
  background: #334155;
  color: #fff;
  text-decoration: none;
  font-size: 15px;
  transition: background 0.2s;
}

.link-btn:hover {
  background: #1e293b;
}

.link-btn.disabled {
  background: #b8c3d8;
  cursor: not-allowed;
}

.btn {
  background: #2566d8;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn:hover:not(:disabled) {
  background: #174ea6;
}

.btn:disabled {
  background: #b8c3d8;
  cursor: not-allowed;
}

.secondary-btn {
  background: #334155;
}

.secondary-btn:hover:not(:disabled) {
  background: #1e293b;
}

.preview-row {
  display: grid;
  grid-template-columns: 96px 1fr;
  gap: 16px;
  margin-top: 20px;
}

.logo-preview,
.background-preview {
  border: 1px solid #e3e6ef;
  background: #f8fafc;
  border-radius: 8px;
  overflow: hidden;
}

.logo-preview {
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.background-preview {
  min-height: 180px;
  aspect-ratio: 16 / 5;
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: flex-end;
}

.background-preview span {
  width: 100%;
  padding: 8px 12px;
  color: #fff;
  background: rgba(0,0,0,0.42);
  font-size: 14px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.stat-box {
  background: #f8fafc;
  border: 1px solid #e3e6ef;
  border-radius: 8px;
  padding: 18px;
}

.stat-label {
  display: block;
  color: #64748b;
  font-size: 14px;
  margin-bottom: 8px;
}

.stat-box strong {
  display: block;
  color: #2566d8;
  font-size: 2rem;
  line-height: 1.1;
}

.message {
  margin: 0;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

@media (max-width: 768px) {
  .site-manage {
    width: 92%;
  }

  .site-panel {
    padding: 16px;
  }

  .panel-header,
  .preview-row,
  .form-grid,
  .stats-grid,
  .link-input-row {
    grid-template-columns: 1fr;
  }

  .panel-header {
    display: grid;
  }

  .logo-preview {
    width: 88px;
    height: 88px;
  }

  .background-preview {
    min-height: 150px;
    aspect-ratio: 16 / 9;
  }
}
</style>

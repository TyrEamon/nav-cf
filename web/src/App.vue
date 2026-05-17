<template>
  <router-view/>
</template>

<script setup>
import { onMounted } from 'vue';
import { getSiteSettings } from './api';

onMounted(async () => {
  try {
    const res = await getSiteSettings();
    applySiteSettings(res.data || {});
  } catch (error) {
    console.error('加载站点设置失败:', error);
  }
});

function applySiteSettings(settings) {
  if (settings.site_name) {
    document.title = settings.site_name;
  }

  if (settings.background_url) {
    document.documentElement.style.setProperty(
      '--nav-background-image',
      `url(${JSON.stringify(settings.background_url)})`,
    );
  }

  if (settings.site_logo_url) {
    setFavicon(settings.site_logo_url);
  }

  injectUmami(settings);
}

function setFavicon(url) {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

function injectUmami(settings) {
  const baseUrl = String(settings.umami_base_url || '').replace(/\/+$/, '');
  const websiteId = String(settings.umami_website_id || '').trim();
  if (!baseUrl || !websiteId) return;

  const existing = document.getElementById('nav-umami-script');
  const src = `${baseUrl}/script.js`;
  if (existing?.src === src && existing?.dataset.websiteId === websiteId) {
    return;
  }

  existing?.remove();
  const script = document.createElement('script');
  script.id = 'nav-umami-script';
  script.defer = true;
  script.src = src;
  script.dataset.websiteId = websiteId;
  document.head.appendChild(script);
}
</script> 

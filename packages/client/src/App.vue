<template>
  <n-config-provider :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <n-loading-bar-provider>
            <router-view />
          </n-loading-bar-provider>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import type { GlobalThemeOverrides } from 'naive-ui';

const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#E07A4B',
    primaryColorHover: '#D4693C',
    primaryColorPressed: '#B85530',
    primaryColorSuppl: '#E8825A',
    bodyColor: '#FAF8F5',
    cardColor: '#FFFFFF',
    textColorBase: '#1A1A1A',
    textColor1: '#1A1A1A',
    textColor2: '#6B6B6B',
    textColor3: '#9B9B9B',
    borderColor: '#E8E4E0',
    dividerColor: '#E8E4E0',
    hoverColor: '#F3F0ED',
    borderRadius: '12px',
    borderRadiusSmall: '8px',
    fontFamily: "'Poppins', 'Noto Sans SC', ui-sans-serif, system-ui, -apple-system, sans-serif",
    fontSize: '14px',
    heightMedium: '40px',
  },
  Card: {
    borderRadius: '16px',
    paddingMedium: '24px',
    paddingSmall: '16px',
    borderColor: '#F0ECE8',
    color: '#FFFFFF',
  },
  Input: {
    borderRadius: '12px',
    border: '1px solid #E8E4E0',
    borderHover: '1px solid #D4693C',
    borderFocus: '1px solid #E07A4B',
    heightMedium: '40px',
    color: '#F3F0ED',
    colorFocus: '#FFFFFF',
    textColor: '#1A1A1A',
    placeholderColor: '#9B9B9B',
    boxShadowFocus: '0 0 0 2px rgba(224, 122, 75, 0.15)',
  },
  Select: {
    peers: {
      InternalSelection: {
        borderRadius: '12px',
        heightMedium: '40px',
        border: '1px solid #E8E4E0',
        borderHover: '1px solid #D4693C',
        borderFocus: '1px solid #E07A4B',
        borderActive: '1px solid #E07A4B',
        color: '#F3F0ED',
        colorActive: '#FFFFFF',
        textColor: '#1A1A1A',
        placeholderColor: '#9B9B9B',
        boxShadowFocus: '0 0 0 2px rgba(224, 122, 75, 0.15)',
        boxShadowActive: '0 0 0 2px rgba(224, 122, 75, 0.15)',
      },
    },
  },
  DataTable: {
    thColor: '#F3F0ED',
    tdColor: '#FFFFFF',
    tdColorStriped: '#FAF8F5',
    borderColor: '#F0ECE8',
    thTextColor: '#6B6B6B',
    tdTextColor: '#1A1A1A',
    borderRadius: '12px',
    thFontWeight: '600',
  },
  Button: {
    borderRadiusMedium: '12px',
    borderRadiusSmall: '8px',
    heightMedium: '40px',
    fontWeight: '500',
    textColorPrimary: '#FFFFFF',
    colorPrimary: '#E07A4B',
    colorHoverPrimary: '#D4693C',
    colorPressedPrimary: '#B85530',
    textColorGhostPrimary: '#E07A4B',
    borderPrimary: '1px solid #E07A4B',
    borderHoverPrimary: '1px solid #D4693C',
    borderPressedPrimary: '1px solid #B85530',
  },
  Tag: {
    borderRadius: '9999px',
    heightSmall: '24px',
  },
  Menu: {
    itemTextColorActive: '#E07A4B',
    itemTextColorActiveHover: '#D4693C',
    itemIconColorActive: '#E07A4B',
    itemIconColorActiveHover: '#D4693C',
    itemColorActive: 'transparent',
    itemColorActiveHover: 'rgba(224, 122, 75, 0.06)',
  },
  Modal: {
    borderRadius: '16px',
  },
  Tabs: {
    tabTextColorActiveLine: '#E07A4B',
    barColor: '#E07A4B',
  },
  Progress: {
    fillColor: '#E07A4B',
    railColor: '#F3F0ED',
  },
  Statistic: {
    labelFontSize: '13px',
    valueFontSize: '20px',
    labelTextColor: '#9B9B9B',
  },
};
</script>

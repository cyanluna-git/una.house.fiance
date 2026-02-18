import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'unahouse.finance 워크스루',
  description: '개인 자산관리 웹서비스 개발 기록',
  themeConfig: {
    nav: [{ text: '홈', link: '/' }],
    sidebar: [
      {
        text: '워크스루',
        items: [
          { text: '2026-02-18 파서 수정 & 전체 임포트', link: '/2026-02-18_22_33_parser-fix-bulk-import' },
        ]
      }
    ]
  }
})

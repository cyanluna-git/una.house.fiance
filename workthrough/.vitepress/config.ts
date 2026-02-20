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
          { text: '2026-02-20 Kanban Review 컬럼', link: '/2026-02-20_08_kanban-review-column' },
          { text: '2026-02-20 Chak 로컬 화폐 파서', link: '/2026-02-20_07_chak-local-currency-parser' },
          { text: '2026-02-20 카드 관리', link: '/2026-02-20_06_card-management' },
          { text: '2026-02-20 대시보드 월별 필터', link: '/2026-02-20_05_dashboard-monthly-filter' },
          { text: '2026-02-20 대시보드 고도화', link: '/2026-02-20_04_dashboard-upgrade' },
          { text: '2026-02-20 카테고리 규칙 UI', link: '/2026-02-20_03_category-rules-ui' },
          { text: '2026-02-20 카테고리 재설계', link: '/2026-02-20_02_00_category-redesign-family-trips' },
          { text: '2026-02-20 대출 관리', link: '/2026-02-20_01_00_loan-management' },
          { text: '2026-02-19 급여 임포트 & 수입 대시보드', link: '/2026-02-19_02_00_salary-import-income-dashboard' },
          { text: '2026-02-19 카테고리 & 사이드바 & 대시보드', link: '/2026-02-19_01_00_category-sidebar-dashboard' },
          { text: '2026-02-18 파서 수정 & 전체 임포트', link: '/2026-02-18_22_33_parser-fix-bulk-import' },
        ]
      }
    ]
  }
})

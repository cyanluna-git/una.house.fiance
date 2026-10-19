// PM2 설정 — Oracle S2 운영용
// cwd는 current 심볼릭 링크, DB는 shared/에 고정. pnpm 없이 node로 직접 실행한다.
module.exports = {
  apps: [
    {
      name: "unahouse-finance",
      cwd: "/opt/demos/unahouse-finance/current",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3104 -H 127.0.0.1",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        UNAHOUSE_DB_PATH: "/opt/demos/unahouse-finance/shared/finance.db",
        // 운영 AI 분류/영수증 분석: Mac mini Ollama (Tailscale 경로, tailscale serve --tcp 11434)
        AI_BASE_URL: "http://100.112.139.36:11434",
        AI_TIMEOUT_MS: "120000",
      },
      max_memory_restart: "450M",
      autorestart: true,
      time: true,
    },
  ],
};

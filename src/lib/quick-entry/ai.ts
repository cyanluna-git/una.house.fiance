// AI provider 추상화 (분류 폴백 + 영수증 비전 분석)
// - ollama(기본): Ollama `/api/chat`. 로컬 또는 tailnet 경로. 이미지 입력 지원.
// - openai: OpenAI 호환 `/v1/chat/completions` (추후 클라우드 폴백용).
// 환경변수: AI_PROVIDER, AI_BASE_URL, AI_MODEL, AI_API_KEY, AI_TIMEOUT_MS
import { CATEGORY_HIERARCHY } from "@/lib/categories";

export type AiProvider = "ollama" | "openai";

export interface AiConfig {
  provider: AiProvider;
  baseUrl: string;
  model: string;
  apiKey?: string;
  timeoutMs: number;
}

export function getAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  return {
    provider: env.AI_PROVIDER === "openai" ? "openai" : "ollama",
    baseUrl: env.AI_BASE_URL || "http://localhost:11434",
    model: env.AI_MODEL || "qwen3.6:35b-a3b",
    apiKey: env.AI_API_KEY,
    timeoutMs: Number(env.AI_TIMEOUT_MS || 90_000),
  };
}

export interface ChatJsonInput {
  prompt: string;
  /** base64(JPEG) 이미지 목록 — 영수증 분석용 */
  images?: string[];
  /** JSON Schema — 출력 형식 강제 */
  schema: object;
}

/** provider에 맞게 호출하고 JSON 객체를 반환. 실패 시 throw. */
export async function chatJson(input: ChatJsonInput, cfg: AiConfig = getAiConfig()): Promise<unknown> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
  try {
    if (cfg.provider === "openai") {
      const content: unknown[] = [{ type: "text", text: input.prompt }];
      for (const img of input.images ?? []) {
        content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${img}` } });
      }
      const res = await fetch(`${cfg.baseUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: cfg.model,
          temperature: 0,
          messages: [{ role: "user", content }],
          response_format: { type: "json_object" },
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
      const data = await res.json();
      return JSON.parse(data.choices?.[0]?.message?.content ?? "{}");
    }

    const res = await fetch(`${cfg.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          {
            role: "user",
            content: input.prompt,
            ...(input.images?.length ? { images: input.images } : {}),
          },
        ],
        stream: false,
        think: false,
        format: input.schema,
        options: { temperature: 0, seed: 42 },
        keep_alive: "10m",
      }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.message?.content ?? "{}");
  } finally {
    clearTimeout(timer);
  }
}

export interface AiClassification {
  categoryL1: string;
  categoryL2: string;
  confidence: number;
}

/** 규칙으로 분류되지 않은 가맹점을 LLM으로 분류. 실패하면 빈 Map (호출자는 '기타/미분류' 유지) */
export async function classifyMerchantsWithAi(
  merchants: string[],
): Promise<Map<string, AiClassification>> {
  const out = new Map<string, AiClassification>();
  const unique = Array.from(new Set(merchants.filter(Boolean)));
  if (!unique.length) return out;

  const l1s = Object.keys(CATEGORY_HIERARCHY);
  const taxonomy = l1s
    .map((l1) => `${l1}: ${Object.keys(CATEGORY_HIERARCHY[l1]).join(", ")}`)
    .join("\n");

  const prompt =
    `한국 가계부 지출 분류기입니다. 각 가맹점명을 아래 분류 체계의 (대분류, 중분류)로 분류하세요. ` +
    `반드시 목록에 있는 값만 쓰고, 확신이 없으면 대분류 "기타", 중분류 "미분류", confidence 낮게 주세요.\n\n` +
    `분류 체계:\n${taxonomy}\n\n가맹점:\n${unique.map((m, i) => `${i + 1}. ${m}`).join("\n")}`;

  const schema = {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            merchant: { type: "string" },
            categoryL1: { type: "string", enum: l1s },
            categoryL2: { type: "string" },
            confidence: { type: "number" },
          },
          required: ["merchant", "categoryL1", "categoryL2", "confidence"],
        },
      },
    },
    required: ["items"],
  };

  try {
    const result = (await chatJson({ prompt, schema })) as {
      items?: { merchant: string; categoryL1: string; categoryL2: string; confidence: number }[];
    };
    for (const it of result.items ?? []) {
      const l2s = CATEGORY_HIERARCHY[it.categoryL1] ? Object.keys(CATEGORY_HIERARCHY[it.categoryL1]) : [];
      if (!l2s.length) continue;
      out.set(it.merchant, {
        categoryL1: it.categoryL1,
        categoryL2: l2s.includes(it.categoryL2) ? it.categoryL2 : "",
        confidence: Math.max(0, Math.min(1, Number(it.confidence) || 0)),
      });
    }
  } catch (e) {
    console.warn("AI classify failed:", (e as Error).message);
  }
  return out;
}


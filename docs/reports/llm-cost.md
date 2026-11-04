# LLM cost report — 2026-11-04

Rates: list prices per 1M tokens (Haiku 5.5 $0.10 in / $0.50 out; Sonnet 5.5 $2 / $10; cache reads ≈ 10% of input), USD→INR 84.
Drills, grading, adaptivity, insight **facts**, readiness and checklists never call an LLM; everything below is optional and has a free template fallback.

## Model (per active student per month)
| Feature | Model | Calls / student / mo | Tokens in/out | ₹ / student / mo | Note |
|---|---|---|---|---|---|
| Insight phrasing (after each drill/mock) | claude-haiku-5-5 | 26.00 | 1400/350 | ₹0.57 | optional; template fallback is free |
| Explain more (wrong answers) | claude-haiku-5-5 | 2.20 | 700/300 | ₹0.03 | 20% tap daily, half served from explanations_cache |
| Resume/LinkedIn 'Draft for me' | claude-sonnet-5-5 | 0.90 | 3000/900 | ₹1.07 | quota 3/month; ~30% of students use it |
| Weekly TPO narrative | claude-sonnet-5-5 | 0.01 | 1500/400 | ₹0.00 | per college, aggregates only |
| **Total** | | | | **₹1.67** | 500 students → ≈ ₹837 / month |

Worst case (every student uses all 3 drafts, every insight rephrased): ≈ ₹4.16 / student / month.
Against the ₹200–500 / student / year price this is 10.0–4.0% of revenue.

## Actuals (llm_usage, last 30 days)
No LLM calls recorded (ANTHROPIC_API_KEY not set in this environment — all features ran on templates).

Controls: per-student draft quota (3/month) + 3/hour rate limit, explain-more 5/min, cached prefixes on every prompt, explanations cached per (question, wrong option), all calls logged to `llm_usage` (visible at /super/llm).

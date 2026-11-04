# Variant generation (Haiku, Message Batches)

Seed question (JSON):
{{SEED_JSON}}

Write 10 NEW variants of this seed that test the same skill with different numbers, names and framing:
- 3 at difficulty {{BAND}}, 4 at difficulty {{BAND}}, 3 at difficulty {{BAND_PLUS_1}} (cap 5).
- Keep section/topic/subtopic/variant_group of the seed. Do not copy the seed's stem.
- For each: "source":"llm_variant", "status":"draft", "seed_id":"{{SEED_ID}}", "version":1, "id":"" (assigned later).
- Solve each variant yourself before writing it; the explanation must reach options[answer_index].

Return a JSON object: {"items":[ ...10 items... ]}

# Blind QA (Sonnet)

You are a strict examiner. Solve this question WITHOUT seeing the intended answer.

Question (answer removed):
{{QUESTION_JSON}}

Work it out in ≤ 60 words, then return STRICT JSON:
{"id":"{{ID}}","my_answer_index":0-3,"ambiguous":true|false,"issues":["..."],"fixed_explanation":"≤80 words or null"}

- "ambiguous": true if more than one option is defensible, none is correct, or the stem is unclear.
- "issues": short notes (factual error, typo, unrealistic numbers, culturally off, too easy for its band…). Empty array if none.
- "fixed_explanation": a corrected explanation if the given one is wrong or > 80 words, else null.
The pipeline sets "matches" = (my_answer_index == intended answer_index).

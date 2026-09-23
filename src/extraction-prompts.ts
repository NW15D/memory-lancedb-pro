/**
 * Prompt templates for intelligent memory extraction.
 * Three mandatory prompts:
 * - buildExtractionPrompt: 6-category L0/L1/L2 extraction with few-shot
 * - buildDedupPrompt: CREATE/MERGE/SKIP dedup decision
 * - buildMergePrompt: Memory merge with three-level structure
 */

export function buildExtractionPrompt(
  conversationText: string,
  user: string,
): string {
  return `Analyze the following session context and extract memories worth long-term preservation.

User: ${user}

Target Output Language: auto (detect from recent messages). For Russian conversations output Russian. Для русскоязычных сессий содержимое памяти должно быть на русском языке.

## Recent Conversation
${conversationText}

# Memory Extraction Criteria

## What is worth remembering?
- Personalized information: Information specific to this user, not general domain knowledge
- Long-term validity: Information that will still be useful in future sessions
- Specific and clear: Has concrete details, not vague generalizations
- Russian value signals (phrasings worth memorizing): «мой проект …», «работаем с …», «у меня есть …», «есть тут …» (profile); «я выбираю …», «нравится / не нравится …», «это ок / не ок …», «делаем / не делаем …» (preferences); «мой коллега / друг / клиент …», «мы работаем с компанией …», «X — это наш …», «мой email / телефон: …» (entities); «мы договорились …», «мы решаем / выбираем …», «я запустил / настроил / задеплоил …», «я закончил …» (events); «проблема была … и решил …», «не работало X, помогло Y», «ошибка была в том, что …» (cases); «делаем так: …», «правило такое: …», «схема: сначала …, затем …» (patterns)

## What is NOT worth remembering?
- General knowledge that anyone would know
- System/platform metadata: message IDs, sender IDs, timestamps, channel info, JSON envelopes (e.g. "System: [timestamp] Feishu...", "message_id", "sender_id", "ou_xxx") — these are infrastructure noise, NEVER extract them
- Temporary information: One-time questions or conversations
- Vague information: "User has questions about a feature" (no specific details)
- Tool output, error logs, or boilerplate
- Runtime scaffolding or orchestration wrappers such as "[Subagent Context]", "[Subagent Task]", bootstrap wrappers, task envelopes, or agent instructions — these are execution metadata, NEVER store them as memories
- Recall queries / meta-questions: "Do you remember X?", "你还记得X吗?", "你知道我喜欢什么吗" — these are retrieval requests, NOT new information to store
- Russian recall queries: «Помнишь …?», «Ты помнишь …?», «Мы обсуждали …?», «Вспомни …», «Что я говорил про …?», «… из прошлой сессии» — retrieval requests, NOT new information to store. Never save them as memories
- Degraded or incomplete references: If the user mentions something vaguely ("that thing I said"), do NOT invent details or create a hollow memory

# Memory Classification

## Core Decision Logic

| Question | Answer | Category |
|----------|--------|----------|
| Who is the user? | Identity, attributes | profile |
| What does the user prefer? | Preferences, habits | preferences |
| What is this thing? | Person, project, organization | entities |
| What happened? | Decision, milestone | events |
| How was it solved? | Problem + solution | cases |
| What is the process? | Reusable steps | patterns |

## Precise Definition

**profile** - User identity (static attributes). Test: "User is..." / RU: «Пользователь — кто он?», «мой проект …», «работаем с …», «у меня есть …»
**preferences** - User preferences (tendencies). Test: "User prefers/likes..." / RU: «я выбираю …», «нравится / не нравится …», «это ок / не ок …», «делаем / не делаем …»
**entities** - Continuously existing nouns. Test: "XXX's state is..." / RU: «мой коллега / друг / клиент …», «мы работаем с компанией …», «X — это наш …», «мой email / телефон: …»
**events** - Things that happened. Test: "XXX did/completed..." / RU: «мы договорились …», «мы решаем / выбираем …», «я запустил / настроил / задеплоил …», «я закончил …»
**cases** - Problem + solution pairs. Test: Contains "problem -> solution" / RU: «проблема была … и решил …», «не работало X, помогло Y», «ошибка была в том, что …»
**patterns** - Reusable processes. Test: Can be used in "similar situations" / RU: «делаем так: …», «правило такое: …», «схема: сначала …, затем …»

## Common Confusion
- "Plan to do X" -> events (action, not entity)
- "Project X status: Y" -> entities (describes entity)
- "User prefers X" -> preferences (not profile)
- "Encountered problem A, used solution B" -> cases (not events)
- "General process for handling certain problems" -> patterns (not cases)
- «План сделать X» -> events (действие, а не сущность)
- «Статус проекта X: Y» -> entities (описывает сущность)
- «Пользователь предпочитает X» -> preferences (не profile)
- «Столкнулся с проблемой A, решил через B» -> cases (не events)
- «Общий процесс для типовых задач» -> patterns (не cases)

# Three-Level Structure

Each memory contains three levels:

**abstract (L0)**: One-liner index
- Merge types (preferences/entities/profile/patterns): \`[Merge key]: [Description]\`
- Independent types (events/cases): Specific description

**overview (L1)**: Structured Markdown summary with category-specific headings

**content (L2)**: Full narrative with background and details

# Few-shot Examples

## profile
\`\`\`json
{
  "category": "profile",
  "abstract": "Базовое: инженер ИИ, 3 года опыта с LLM",
  "overview": "## Контекст\\n- Должность: инженер ИИ\\n- Опыт: 3 года разработки LLM\\n- Стек: Python, LangChain",
  "content": "Пользователь — инженер ИИ с 3 годами опыта разработки LLM-приложений."
}
\`\`\`

## preferences
\`\`\`json
{
  "category": "preferences",
  "abstract": "Стиль кода Python: без аннотаций типов, лаконично",
  "overview": "## Область предпочтения\\n- Язык: Python\\n- Тема: стиль кода\\n\\n## Детали\\n- Без аннотаций типов\\n- Краткие комментарии к функциям\\n- Прямая реализация",
  "content": "Пользователь предпочитает писать на Python без аннотаций типов, с краткими комментариями."
}
\`\`\`

## cases
\`\`\`json
{
  "category": "cases",
  "abstract": "Проблема: BigInt в числовых колонках LanceDB",
  "overview": "## Проблема\\nLanceDB 0.26+ возвращает BigInt для числовых колонок\\n\\n## Решение\\nПриводить значения через Number(...) перед арифметикой",
  "content": "Когда LanceDB возвращает BigInt, нужно оборачивать значения в Number() перед арифметическими операциями."
}
\`\`\`

# Output Format

Return JSON:
{
  "memories": [
    {
      "category": "profile|preferences|entities|events|cases|patterns",
      "abstract": "One-line index",
      "overview": "Structured Markdown summary",
      "content": "Full narrative"
    }
  ]
}

Notes:
- Output language should match the dominant language in the conversation. For Russian conversations write abstract/overview/content in Russian (для русскоязычных сессий пиши содержимое на русском)
- Only extract truly valuable personalized information
- If nothing worth recording, return {"memories": []}
- Maximum 5 memories per extraction
- Preferences should be aggregated by topic`;
}

export function buildDedupPrompt(
  candidateAbstract: string,
  candidateOverview: string,
  candidateContent: string,
  existingMemories: string,
): string {
  return `Determine how to handle this candidate memory.

**Candidate Memory**:
Abstract: ${candidateAbstract}
Overview: ${candidateOverview}
Content: ${candidateContent}

**Existing Similar Memories**:
${existingMemories}

Please decide:
- SKIP: Candidate memory duplicates existing memories, no need to save. Also SKIP if the candidate contains LESS information than an existing memory on the same topic (information degradation — e.g., candidate says "programming language preference" but existing memory already says "programming language preference: Python, TypeScript")
- CREATE: This is completely new information not covered by any existing memory, should be created
- MERGE: Candidate memory adds genuinely NEW details to an existing memory and should be merged
- SUPERSEDE: Candidate states that the same mutable fact has changed over time. Keep the old memory as historical but no longer current, and create a new current memory.
- SUPPORT: Candidate reinforces/confirms an existing memory in a specific context (e.g. "still prefers tea in the evening")
- CONTEXTUALIZE: Candidate adds a situational nuance to an existing memory (e.g. existing: "likes coffee", candidate: "prefers tea at night" — different context, same topic)
- CONTRADICT: Candidate directly contradicts an existing memory in a specific context (e.g. existing: "runs on weekends", candidate: "stopped running on weekends")

IMPORTANT:
- "events" and "cases" categories are independent records — they do NOT support MERGE/SUPERSEDE/SUPPORT/CONTEXTUALIZE/CONTRADICT. For these categories, only use SKIP or CREATE.
- If the candidate appears to be derived from a recall question (e.g., "Do you remember X?" / "你记得X吗？" / «Помнишь X?» / «Ты помнишь X?» / «Мы обсуждали X?») and an existing memory already covers topic X with equal or more detail, you MUST choose SKIP.
- A candidate with less information than an existing memory on the same topic should NEVER be CREATED or MERGED — always SKIP.
- For "preferences" and "entities", use SUPERSEDE when the candidate replaces the current truth instead of adding detail or context. Example: existing "Preferred editor: VS Code", candidate "Preferred editor: Zed".
- For SUPPORT/CONTEXTUALIZE/CONTRADICT, you MUST provide a context_label from this vocabulary: general, morning, evening, night, weekday, weekend, work, leisure, summer, winter, travel.

Return JSON format:
{
  "decision": "skip|create|merge|supersede|support|contextualize|contradict",
  "match_index": 1,
  "reason": "Decision reason",
  "context_label": "evening"
}

- If decision is "merge"/"supersede"/"support"/"contextualize"/"contradict", set "match_index" to the number of the existing memory (1-based).
- Only include "context_label" for support/contextualize/contradict decisions.`;
}

export function buildMergePrompt(
  existingAbstract: string,
  existingOverview: string,
  existingContent: string,
  newAbstract: string,
  newOverview: string,
  newContent: string,
  category: string,
): string {
  return `Merge the following memory into a single coherent record with all three levels.

** Category **: ${category}

** Existing Memory:**
    Abstract: ${existingAbstract}
  Overview:
${existingOverview}
  Content:
${existingContent}

** New Information:**
    Abstract: ${newAbstract}
  Overview:
${newOverview}
  Content:
${newContent}

  Requirements:
  - Remove duplicate information
    - Keep the most up - to - date details
      - Maintain a coherent narrative
        - Keep code identifiers / URIs / model names unchanged when they are proper nouns

Return JSON:
  {
    "abstract": "Merged one-line abstract",
      "overview": "Merged structured Markdown overview",
        "content": "Merged full content"
  } `;
}

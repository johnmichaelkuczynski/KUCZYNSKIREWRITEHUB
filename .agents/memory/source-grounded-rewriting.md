---
name: Source-grounded rewriting
description: The core product requirement for corpus-backed style rewriting.
---
The app must rewrite target text in John-Michael Kuczynski's style using API access to his actual work, not by "winging it." Users must be able to choose ChatGPT, Anthropic, DeepSeek, or Grok. The user clarified that the corpus API is part of their Genius 101 app, but emphatically distinguished the Kuczynski key from a Genius 101 key. Request the Kuczynski key, not a Genius 101 key.

**Why:** The user explicitly identified access to Kuczynski's work through his API key as the essence of the product.

**How to apply:** Establish the actual corpus API contract and retrieve source material before generation. Do not substitute a generic style prompt or silently generate without source access.

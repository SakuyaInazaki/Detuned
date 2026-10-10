# Hover contrast repair

The global `button:hover:not(:disabled)` rule has greater specificity than `.post-directory button`. Hover therefore kept the reading button's dark text on a dark background. The authorized repair adds only its dedicated hover rule with background `#e0f0e8` and color `#185e51`. Original source/test v1 manifest is preserved; v2 changes only CSS. No new test or typecheck was run for this CSS-only edit. D owns the necessary Web rebuild/computed-hover/viewport evidence.

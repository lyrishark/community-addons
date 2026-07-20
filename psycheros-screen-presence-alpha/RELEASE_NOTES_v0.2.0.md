# Screen Presence Alpha 0.2.0

Compatibility release for **Psycheros 0.9.2**.

- Rebuilt the screen-presence feature from its original feature commit onto
  pristine upstream 0.9.2.
- Retains screen captions, turn-time flushing, bounded visual-state journaling,
  and the intended provider-error guidance.
- Removes unrelated uploads, fonts, response regeneration, auto-title, and
  queued-turn changes that had hitchhiked in the old staged snapshot.
- Passed type checking, browser-script syntax checking, and all 7 focused
  screen-presence and error tests.
- The installer accepts only Psycheros 0.9.2.

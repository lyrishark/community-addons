# Gemini Export Trial

This trial checks whether Gemini chat text can be paired with Gemini Apps
Activity timestamps well enough to produce a coherent import draft.

## What to Install

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Click **Load unpacked**.
4. Select the `browser-thread-exporter` folder.
5. Open or refresh the Gemini chat page and Gemini Apps Activity page.

## One-Turn Smoke Test

1. In Gemini, create a short test chat with one prompt and one response.
2. On the Gemini chat page, click **Export Gemini Draft**.
3. Open [Gemini Apps Activity](https://myactivity.google.com/product/gemini).
4. Click **Export Activity** on the main Activity page.
5. Open the extension's **Options** page, or open `gemini-merge.html`.
6. Drop both JSON files, then click **Merge and Download Batch**.

## Multi-Turn Test

For a fast test, export one or more Gemini thread drafts and export the visible
Activity list once. For a higher-confidence test, open Activity **Details** for
each user prompt and click **Export Activity** inside each dialog. Drop all of
those files into the merge page and download the batch.

## Expected Result

The merged file should report:

- `matched_user_messages` equal to the number of exported or visible Activity
  prompts.
- `unmatched_user_messages` as `0` for a clean test.
- Assistant messages marked `inferred-from-preceding-activity-prompt`.

Gemini does not expose exact assistant message timestamps, so assistant
timestamps are inferred from the matched prompt timestamp and visible chat
order.

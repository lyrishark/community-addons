# Gemini Full History Export Trial

Goal: export all Gemini chat threads plus Gemini Apps Activity, merge them into
one batch file, and send the raw files plus the merged file back to the test
coordinator.

This is a test build. It is okay if something breaks. The most useful thing is
to keep the files and tell the test coordinator exactly where it broke.

## 1. Install or Update the Extension

1. Download the test zip you were sent.
2. Right-click the zip and choose **Extract All**.
3. Extract it into a fresh folder. Do not load the zip file itself.
4. Open Chrome.
5. Go to `chrome://extensions`.
6. Turn on **Developer mode** in the top right.
7. If **Psycheros Thread Exporter** is already loaded, click its refresh/reload
   icon.
8. If it is not loaded yet, click **Load unpacked** and select the extracted
   folder that contains `manifest.json`.

The extension version should show `0.3.2`.

If Chrome says **Could not load manifest** or **File path cannot be resolved**:

1. Wait a few seconds for extraction to finish.
2. Click **Load unpacked** again.
3. Select the folder that directly contains `manifest.json`.
4. If there is a folder inside a folder, go one level deeper.
5. If it still fails, delete the extracted folder, extract the zip again into a
   fresh folder, and load that fresh folder.

## 2. Make a Folder for the Export Files

Create one folder somewhere easy to find, for example:

```text
Downloads\Gemini Psycheros Export Test
```

Put every downloaded JSON file from this trial in that folder. If Chrome
downloads files somewhere else automatically, move them into this folder after
each batch.

## 3. Export Each Gemini Chat Thread

1. Open Gemini: `https://gemini.google.com/`.
2. Open the first chat from the Gemini sidebar/history.
3. Wait for the chat to finish loading.
4. For long chats, scroll through the conversation once before exporting so
   Gemini has a chance to load the visible thread text.
5. Click the floating **Export Gemini Draft** button.
6. Save or move the downloaded `.json` file into your export folder.
7. Repeat for every separate Gemini chat thread you want included.

Expected thread filenames usually end in `_draft.json`.

## 4. Export Gemini Apps Activity

1. Open Gemini Apps Activity: `https://myactivity.google.com/product/gemini`.
2. Scroll down slowly until you reach the oldest Gemini activity you want
   included.
3. If the page loads more activity while you scroll, keep going until it stops
   or until you reach the history limit you care about.
4. Scroll back near the top is optional; the exporter reads the visible/loaded
   page text.
5. Click the floating **Export Activity** button.
6. Save or move the downloaded `gemini-activity-list_..._draft.json` file into
   your export folder.

Important: Google may only retain Gemini Activity for the account's configured
retention window, commonly 18 months. Anything deleted from Google Activity
cannot be recovered by this extension.

## 5. Merge the Gemini Files

1. Open `chrome://extensions`.
2. Find **Psycheros Thread Exporter**.
3. Click **Details**.
4. Click **Extension options**.
5. The page title should be **Gemini Export Merger**.
6. Click **Choose files** or click the large **Choose or drop Gemini JSON
   exports** box. If drag-and-drop opens a bunch of tabs instead of loading
   files, close those tabs and use **Choose files**.
7. Select all of the Gemini `.json` files in your export folder:
   - every Gemini thread draft
   - the Gemini Activity list export
   - any Activity Detail exports, if you made any
8. Click **Merge and Download Batch**.
9. Save or move the downloaded merged batch JSON into the same export folder.

You should see a merge report. A good result is:

- conversations failed: `0`
- unmatched user prompts: ideally `0`
- matched prompts: more is better

If there are unmatched prompts or missing timestamps, do not panic. The chat
text is still preserved. The report will show which threads need attention and
offer a **Download Repair Report** button.

## 5a. How to Repair Missing Timestamps

Only do this if the merge screen shows **Repair**, **Review**, or **No Time**
threads.

1. Open each problem Gemini chat thread.
2. Scroll through the thread once so Gemini loads the whole visible transcript.
3. Export that thread draft again.
4. Open Gemini Apps Activity: `https://myactivity.google.com/product/gemini`.
5. Scroll farther back than the oldest problem thread and export the Activity
   list again.
6. If the same thread still has unmatched prompts, search Gemini Apps Activity
   for words from the missing prompt.
7. When you find the matching Activity item, open **Details** and export that
   Activity Detail JSON.
8. Go back to **Gemini Export Merger** and load all files together:
   - the thread drafts
   - the Activity list
   - any Activity Detail JSON files
9. Click **Merge and Download Batch** again.

Advanced optional retry: if the report says prompts are unmatched because the
Activity snippet is shortened or slightly different, try lowering **Match
threshold** from `0.72` to `0.68` and merge again. If the report starts showing
strange matches, change it back to `0.72`.

If Google Activity no longer contains a prompt, the extension cannot recover
that timestamp. Keep the partial export and send it anyway.

## 6. Zip Everything and Send It Back

Zip the whole export folder and return it to the test coordinator.

Please include:

- all Gemini thread draft JSON files
- the Gemini Activity list JSON file
- the merged batch JSON file
- the repair report text file, if you downloaded one
- any screenshots of errors or weird merge report numbers

## What This Test Can and Cannot Prove

Gemini does not expose exact assistant-message timestamps in the normal chat
page. The merger uses Gemini Apps Activity timestamps for user prompts, then
infers assistant response timestamps from the chat order. That is expected.

This trial is mainly checking:

- whether long Gemini histories can be exported without missing thread text
- whether the Activity list has enough prompt snippets to match the threads
- where matching breaks when there are many similar prompts, old entries,
  images, or deleted activity records

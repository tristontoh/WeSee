/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Hands a blob to the browser as a file.
 *
 * The revoke is deferred on purpose. `click()` only *queues* the download; revoking the object URL
 * in the same synchronous block sometimes pulled the blob away before the browser had read it, and
 * the failure surfaced as a success toast with no file. It reproduced on a loaded machine and not
 * on an idle one — which is why every call site goes through here instead of each remembering to
 * wait. A minute is far longer than any queued download needs and costs one blob until then.
 */
export function saveBlob(blob: Blob, filename: string) {
  saveObjectUrl(URL.createObjectURL(blob), filename);
}

/** As above, for a text payload the caller has already built. */
export function saveText(content: string, filename: string, type: string) {
  saveBlob(new Blob([content], { type }), filename);
}

function saveObjectUrl(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

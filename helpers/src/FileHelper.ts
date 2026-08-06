export interface PresignedUploadData {
  url: string;
  fields?: Record<string, string>;
  key?: string;
  method?: "POST" | "PUT";
  headers?: Record<string, string>;
  rawBody?: boolean;
  chunkSize?: number;
  externalIdField?: string;
}

export class FileHelper {

  // Uploads to whatever the api presigned: legacy S3 form-POST, raw-body PUT/POST
  // (Google Drive/Dropbox/S3-compatible), or chunked PUT sessions (OneDrive).
  // Returns the provider file id when the upload response carries one (externalIdField).
  static uploadPresignedFile = async (presigned: PresignedUploadData, uploadedFile: File, progressCallback: (percent: number) => void): Promise<{ externalId?: string }> => {
    if (!presigned.rawBody) {
      await FileHelper.postPresignedFile(presigned, uploadedFile, progressCallback);
      return {};
    }
    if (presigned.chunkSize && uploadedFile.size > presigned.chunkSize) return FileHelper.uploadChunked(presigned, uploadedFile, progressCallback);
    const response = await FileHelper.sendRaw(presigned.method || "PUT", presigned.url, uploadedFile, presigned.headers, progressCallback);
    return { externalId: FileHelper.extractExternalId(presigned, response) };
  };

  private static sendRaw(method: string, url: string, body: Blob, headers: Record<string, string> | undefined, progressCallback: (percent: number) => void, progressBase = 0, progressSpan = 100): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) progressCallback(Math.round(progressBase + (event.loaded / event.total) * progressSpan));
      });
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
        else reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
      });
      xhr.addEventListener("error", () => reject(new Error("Network error occurred")));
      xhr.open(method, url);
      const h = headers || {};
      for (const name in h) xhr.setRequestHeader(name, h[name]);
      xhr.send(body);
    });
  }

  private static async uploadChunked(presigned: PresignedUploadData, uploadedFile: File, progressCallback: (percent: number) => void): Promise<{ externalId?: string }> {
    const total = uploadedFile.size;
    const chunkSize = presigned.chunkSize || total;
    let response = "";
    for (let start = 0; start < total; start += chunkSize) {
      const end = Math.min(start + chunkSize, total);
      const headers = { ...presigned.headers, "Content-Range": `bytes ${start}-${end - 1}/${total}` };
      response = await FileHelper.sendRaw(presigned.method || "PUT", presigned.url, uploadedFile.slice(start, end), headers, progressCallback, (start / total) * 100, ((end - start) / total) * 100);
    }
    return { externalId: FileHelper.extractExternalId(presigned, response) };
  }

  private static extractExternalId(presigned: PresignedUploadData, response: string): string | undefined {
    if (!presigned.externalIdField) return presigned.key;
    try {
      return JSON.parse(response)?.[presigned.externalIdField] || presigned.key;
    } catch {
      return presigned.key;
    }
  }

  static postPresignedFile = (presigned: any, uploadedFile: File, progressCallback: (percent: number) => void) => {
    const formData = new FormData();
    formData.append("acl", "public-read");
    formData.append("Content-Type", uploadedFile.type);
    for (const property in presigned.fields) formData.append(property, presigned.fields[property]);
    formData.append("file", uploadedFile);

    // Use XMLHttpRequest for upload progress tracking since fetch doesn't support it natively
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          progressCallback(percent);
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            status: xhr.status,
            statusText: xhr.statusText,
            data: xhr.responseText
          });
        } else {
          reject(new Error(`HTTP Error: ${xhr.status} ${xhr.statusText}`));
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Network error occurred"));
      });

      xhr.open("POST", presigned.url);
      xhr.send(formData);
    });
  };

  static dataURLtoBlob(dataurl: string) {
    const arr = dataurl.split(",");
    if (arr.length < 2) throw new Error("Invalid data URL format");
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error("Invalid MIME type in data URL");
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
}

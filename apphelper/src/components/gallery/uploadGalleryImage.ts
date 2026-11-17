import { FileHelper } from "@churchapps/helpers";
import { ApiHelper } from "../../helpers";

export const uploadGalleryImage = async (folder: string, dataUrl: string) => {
  const blob = FileHelper.dataURLtoBlob(dataUrl);
  // Name the file from its type so disk storage serves it with the right Content-Type.
  const extension = blob.type.split("/")[1] || "jpg";
  const fileName = Math.floor(Date.now() / 1000).toString() + "." + extension;
  const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });

  const params = { folder, fileName };

  const presigned = await ApiHelper.post("/gallery/requestUpload", params, "ContentApi");
  if (presigned?.key !== undefined) await FileHelper.postPresignedFile(presigned, file, () => { });
  else {
    // Self-hosted installs store files on disk and have no presigned slot; send the image to the API.
    const uploaded = await ApiHelper.post("/gallery/upload", { folder, fileName, contentType: file.type, fileContents: dataUrl }, "ContentApi");
    if (uploaded?.key === undefined) throw new Error("Upload failed - no key received");
  }
};

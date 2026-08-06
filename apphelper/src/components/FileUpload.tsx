"use client";
import React, { useState, useEffect } from "react";
import { FileHelper } from "@churchapps/helpers";
import { LinearProgress } from "@mui/material";
import { ApiHelper, Locale, FileInterface } from "../helpers";

interface Props {
  pendingSave: boolean;
  saveCallback: (file: FileInterface) => void;
  contentType: string;
  contentId: string;
}

export function FileUpload(props: Props) {
  const [file, setFile] = useState<FileInterface>({} as FileInterface);
  const [uploadedFile, setUploadedFile] = useState<File>({} as File);
  const [uploadProgress, setUploadProgress] = useState(-1);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const convertBase64 = () => new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(uploadedFile);
    fileReader.onload = () => { resolve(fileReader.result); };
    fileReader.onerror = (error) => { reject(error); };
  });

  const handleSave = async () => {
    setUploadError(null);
    const f = { ...file };
    f.size = uploadedFile.size;
    f.fileType = uploadedFile.type;
    f.fileName = uploadedFile.name;
    f.contentType = props.contentType;
    f.contentId = props.contentId;
    try {
      const preUploaded = await preUpload();
      if (!preUploaded) {
        const base64 = await convertBase64();
        f.fileContents = base64 as string;
      } else if (preUploaded.externalId) f.externalId = preUploaded.externalId;
      const data: FileInterface[] = await ApiHelper.post("/files", [f], "ContentApi");
      setFile({});
      setUploadedFile({} as File);
      const el = document.getElementById("fileUpload") as HTMLInputElement | null;
      if (el) el.value = "";
      props.saveCallback(data[0]);
    } catch (error) {
      const isQuota = String((error as Error)?.message || error).includes("storage_quota_exceeded");
      setUploadError(isQuota
        ? Locale.label("fileUpload.quotaExceeded", "Storage quota exceeded. Delete unused files or upgrade your storage plan.")
        : Locale.label("fileUpload.uploadFailed", "Upload failed. Please try again."));
      setUploadProgress(-1);
    }
  };

  const checkSave = () => {
    if (props.pendingSave) {
      if (uploadedFile.size > 0) handleSave();
      else props.saveCallback(file);
    }
  };

  const preUpload = async (): Promise<{ externalId?: string } | false> => {
    const params = { fileName: uploadedFile.name, contentType: props.contentType, contentId: props.contentId, size: uploadedFile.size, mimeType: uploadedFile.type };
    const presigned = await ApiHelper.post("/files/postUrl", params, "ContentApi");
    if (presigned.error) throw new Error(presigned.error);
    if (presigned.key === undefined) return false;
    return FileHelper.uploadPresignedFile(presigned, uploadedFile, setUploadProgress);
  };

  useEffect(checkSave, [props.pendingSave]);

  const getFileLink = () => {
    if (uploadProgress > -1 && props.pendingSave) return <LinearProgress value={uploadProgress} />;
    else if (file) return (<div><a href={file.contentPath}>{file.fileName}</a></div>);
  };

  return (
    <>
      <label>{Locale.label("fileUpload.file")}</label>
      {uploadError && <div style={{ color: "#d32f2f", fontSize: 13, marginBottom: 4 }}>{uploadError}</div>}
      {getFileLink()}
      <input id="fileUpload" type="file" onChange={handleChange} data-testid="file-upload-input" />
    </>
  );
}

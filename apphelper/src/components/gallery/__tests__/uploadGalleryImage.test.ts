import { beforeEach, describe, expect, it, vi } from "vitest";

const post = vi.fn();
const postPresignedFile = vi.fn(async () => {});
vi.mock("../../../helpers", () => ({ ApiHelper: { post: (...args: any[]) => post(...args) } }));
vi.mock("@churchapps/helpers", () => ({
  FileHelper: {
    dataURLtoBlob: () => new Blob(["png-bytes"], { type: "image/png" }),
    postPresignedFile: (...args: any[]) => postPresignedFile(...args)
  }
}));

import { uploadGalleryImage } from "../uploadGalleryImage";

const dataUrl = "data:image/png;base64,cG5nLWJ5dGVz";

beforeEach(() => { post.mockReset(); postPresignedFile.mockClear(); });

describe("uploadGalleryImage", () => {
  it("sends the image to its presigned S3 slot", async () => {
    post.mockResolvedValueOnce({ key: "c1/gallery/1/1.jpg", url: "https://s3.test" });
    await uploadGalleryImage("1", dataUrl);
    expect(postPresignedFile).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/gallery/requestUpload", expect.objectContaining({ fileName: expect.stringMatching(/\.png$/) }), "ContentApi");
  });

  // Self-hosted installs store files on disk and get no presigned slot back.
  it("posts the image to the API when there is no presigned slot", async () => {
    post.mockResolvedValueOnce({}).mockResolvedValueOnce({ key: "c1/gallery/1/1.jpg" });
    await uploadGalleryImage("1", dataUrl);
    expect(postPresignedFile).not.toHaveBeenCalled();
    expect(post).toHaveBeenNthCalledWith(1, "/gallery/requestUpload", expect.objectContaining({ fileName: expect.stringMatching(/\.png$/) }), "ContentApi");
    expect(post).toHaveBeenLastCalledWith("/gallery/upload", expect.objectContaining({ folder: "1", contentType: "image/png", fileContents: dataUrl, fileName: expect.stringMatching(/\.png$/) }), "ContentApi");
  });

  it("fails when the API does not store the image either", async () => {
    post.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    await expect(uploadGalleryImage("1", dataUrl)).rejects.toThrow();
  });
});

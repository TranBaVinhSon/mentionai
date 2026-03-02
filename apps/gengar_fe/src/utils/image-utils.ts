/**
 * Downloads an image from a URL and converts it to a File object
 * @param imageUrl The URL of the image to download
 * @param filename Optional filename for the File object (defaults to "avatar.jpg")
 * @returns A Promise that resolves to a File object
 */
export async function downloadImageAsFile(
  imageUrl: string,
  filename: string = "avatar.jpg"
): Promise<File> {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Convert response to blob
    const blob = await response.blob();

    // Determine the file extension from the content type or URL
    let extension = filename.split(".").pop() || "jpg";
    const contentType = blob.type;
    if (contentType) {
      if (contentType.includes("png")) extension = "png";
      else if (contentType.includes("jpeg") || contentType.includes("jpg"))
        extension = "jpg";
      else if (contentType.includes("webp")) extension = "webp";
    }

    // Create a File object from the blob
    const file = new File([blob], filename.replace(/\.[^.]+$/, `.${extension}`), {
      type: blob.type || `image/${extension}`,
    });

    return file;
  } catch (error) {
    console.error("Error downloading image:", error);
    throw new Error(`Failed to download image: ${error instanceof Error ? error.message : String(error)}`);
  }
}




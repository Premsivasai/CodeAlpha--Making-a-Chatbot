export async function searchByImageStub(imageName: string): Promise<string> {
  console.log(`[CLIP Visual Search Mock] Generating image embedding for: ${imageName}...`);
  return `master-product-visual-match-${Date.now()}`;
}

export async function speechToTextStub(
  audioBase64: string,
  language = "en"
): Promise<string> {
  console.log(`[STT Speech Transcribe Mock] Processing voice search stream in: ${language}...`);
  return "gaming phone under 20000";
}

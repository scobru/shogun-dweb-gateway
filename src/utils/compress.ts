import { Buffer } from 'buffer';

/**
 * URL-based text compression utilities
 * 
 * Based on textarea.my (https://github.com/antonmedv/textarea)
 * Uses native CompressionStream API with deflate-raw for browser-native compression
 */

/**
 * Compress a string to base64url-encoded deflate-raw format
 * @param text - Text to compress
 * @returns Base64url-encoded compressed string
 */
export async function compress(text: string): Promise<string> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  const buffer = await new Response(stream).arrayBuffer();
  
  // Use Buffer for fast base64 encoding (Node & Browser with polyfill)
  // This avoids the O(N) loop and string concatenation issues of the original implementation
  const binary = Buffer.from(buffer).toString('base64');

  // Make URL-safe
  return binary
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decompress a base64url-encoded deflate-raw string
 * @param b64 - Base64url-encoded compressed string
 * @returns Original decompressed text
 */
export async function decompress(b64: string): Promise<string> {
  // Convert base64url back to standard base64
  let base64 = b64.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding if needed
  while (base64.length % 4) {
    base64 += '=';
  }
  
  // Decode base64 to bytes
  const binary = atob(base64);
  const byteArray = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    byteArray[i] = binary.charCodeAt(i);
  }
  
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  writer.write(byteArray);
  writer.close();
  const buffer = await new Response(stream.readable).arrayBuffer();
  return new TextDecoder().decode(buffer);
}

/**
 * Extract content and optional style from compressed data
 * Style is separated from content by a null byte (\x00)
 * @param compressed - Compressed string (without # prefix)
 * @returns Object with content and optional style
 */
export async function decompressWithStyle(compressed: string): Promise<{ content: string; style?: string }> {
  const data = await decompress(compressed);
  const [content, style] = data.split('\x00');
  return { content, style: style || undefined };
}

/**
 * Compress content with optional style
 * @param content - Text content
 * @param style - Optional CSS style string
 * @returns Compressed base64url string
 */
export async function compressWithStyle(content: string, style?: string): Promise<string> {
  const data = style ? `${content}\x00${style}` : content;
  return compress(data);
}

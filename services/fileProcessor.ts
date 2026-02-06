/**
 * 文件处理工具集
 * 用于处理 PDF 解析、图片压缩、文件预览等功能
 */

import * as pdfjsLib from 'pdfjs-dist';

// 设置 PDF.js worker - 使用 Vite 的方式加载 worker
const workerUrl = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).href;
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * 解析 PDF 文件，提取所有文本内容
 */
export async function extractPDFText(file: File): Promise<{
  text: string;
  pageCount: number;
  metadata?: any;
}> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    const pageCount = pdf.numPages;
    
    for (let i = 1; i <= pageCount; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `\n--- 第 ${i} 页 ---\n${pageText}`;
    }
    
    // 尝试获取元数据
    let metadata;
    try {
      const metadataObj = await pdf.getMetadata();
      metadata = metadataObj?.info;
    } catch (e) {
      console.warn('无法获取 PDF 元数据:', e);
    }
    
    return {
      text: fullText.trim(),
      pageCount,
      metadata,
    };
  } catch (error: any) {
    console.error('PDF 解析失败:', error);
    throw new Error(`PDF 解析失败: ${error.message}`);
  }
}

/**
 * 将 PDF 第一页转换为图片预览
 */
export async function getPDFPreview(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(1);
    
    const scale = 0.5;
    const viewport = page.getViewport({ scale });
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    }).promise;
    
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (error: any) {
    console.error('PDF 预览生成失败:', error);
    throw new Error(`PDF 预览生成失败: ${error.message}`);
  }
}

/**
 * 将 PDF 前几页渲染为图片（用于视觉模型）
 */
export async function renderPDFPagesToImages(
  file: File,
  options: {
    maxPages?: number;
    maxWidth?: number;
    quality?: number;
  } = {}
): Promise<{ images: string[]; pageCount: number }> {
  const { maxPages = 3, maxWidth = 1024, quality = 0.75 } = options;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageCount = pdf.numPages;
  const renderCount = Math.min(pageCount, maxPages);
  const images: string[] = [];

  for (let i = 1; i <= renderCount; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1 });
    const scale = Math.min(1, maxWidth / viewport.width);
    const scaledViewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('无法获取 PDF 渲染上下文');
    }
    canvas.width = scaledViewport.width;
    canvas.height = scaledViewport.height;

    await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise;
    images.push(canvas.toDataURL('image/jpeg', quality));
  }

  return { images, pageCount };
}

/**
 * 压缩并转换图片为 Base64
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/webp' | 'image/png';
  } = {}
): Promise<{
  base64: string;
  width: number;
  height: number;
  size: number;
}> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.85,
    format = 'image/jpeg',
  } = options;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // 计算缩放比例
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // 创建 Canvas 并绘制
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        
        // 转换为 Base64
        const base64 = canvas.toDataURL(format, quality);
        
        resolve({
          base64,
          width,
          height,
          size: Math.round(base64.length * 0.75), // 估算 Base64 解码后大小
        });
      };
      img.onerror = () => reject(new Error('图片加载失败'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

/**
 * 生成图片缩略图预览
 */
export async function generateThumbnail(
  file: File,
  size: number = 100
): Promise<string> {
  const result = await compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
  });
  return result.base64;
}

/**
 * 读取文本文件内容
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 获取文件类型图标
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'picture_as_pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'description';
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'table_chart';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'slideshow';
  if (mimeType.startsWith('text/')) return 'article';
  if (mimeType.startsWith('audio/')) return 'audio_file';
  if (mimeType.startsWith('video/')) return 'video_file';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar')) return 'folder_zip';
  return 'attach_file';
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 检查文件类型是否支持
 */
export function isFileTypeSupported(mimeType: string): boolean {
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
  ];
  return supportedTypes.includes(mimeType);
}

/**
 * 处理上传的文件，准备发送给 AI
 */
export interface ProcessedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string; // 缩略图预览 base64
  content?: string; // 文本内容（用于 PDF、文本文件）
  base64?: string; // 完整的 base64 数据（用于图片）
  images?: string[]; // PDF 页面转图片后的 base64 数据
  error?: string;
}

export async function processFileForAI(file: File): Promise<ProcessedFile> {
  const id = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const result: ProcessedFile = {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
  };

  try {
    // 图片处理
    if (file.type.startsWith('image/')) {
      const compressed = await compressImage(file);
      result.preview = await generateThumbnail(file, 80);
      result.base64 = compressed.base64;
      return result;
    }

    // PDF 处理
    if (file.type === 'application/pdf') {
      try {
        result.preview = await getPDFPreview(file);
      } catch (e) {
        console.warn('PDF 预览生成失败:', e);
      }
      const pdfResult = await extractPDFText(file);
      result.content = pdfResult.text;
      try {
        const pdfImages = await renderPDFPagesToImages(file);
        result.images = pdfImages.images;
      } catch (e) {
        console.warn('PDF 转图片失败:', e);
      }
      return result;
    }

    // 文本文件处理
    if (file.type.startsWith('text/') || file.type === 'application/json') {
      result.content = await readTextFile(file);
      return result;
    }

    // 不支持的文件类型
    result.error = '不支持的文件类型';
    return result;
  } catch (error: any) {
    result.error = error.message;
    return result;
  }
}

/**
 * 构建带附件的 AI 消息
 */
export function buildMessageWithAttachments(
  userMessage: string,
  processedFiles: ProcessedFile[]
): { text: string; images: string[] } {
  const images: string[] = [];
  const textParts: string[] = [];

  for (const file of processedFiles) {
    if (file.error) continue;

    // 图片
    if (file.type.startsWith('image/') && file.base64) {
      images.push(file.base64);
      textParts.push(`[图片: ${file.name}]`);
    }
    // PDF 或文本
    else if (file.content) {
      textParts.push(`\n--- 文件: ${file.name} ---\n${file.content}\n--- 文件结束 ---\n`);
    }
    if (file.type === 'application/pdf' && file.images && file.images.length > 0) {
      images.push(...file.images);
      textParts.push(`[PDF 转图片: ${file.name}，共 ${file.images.length} 页]`);
    }
  }

  // 组合消息
  let finalText = userMessage;
  if (textParts.length > 0) {
    finalText = `${userMessage}\n\n附件内容:\n${textParts.join('\n')}`;
  }

  return { text: finalText, images };
}

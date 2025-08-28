/**
 * 图片缓存服务 - 基于浏览器原生缓存的简单可靠方案
 */

interface ImageCacheOptions {
  maxConcurrentLoads?: number;
  timeout?: number;
}

class ImageCacheService {
  private loadingImages = new Set<string>();
  private loadedImages = new Set<string>();
  private failedImages = new Set<string>();
  private maxConcurrentLoads: number;
  private timeout: number;

  constructor(options: ImageCacheOptions = {}) {
    this.maxConcurrentLoads = options.maxConcurrentLoads || 3;
    this.timeout = options.timeout || 10000; // 10秒超时
  }

  /**
   * 预加载单个图片
   */
  async preloadImage(url: string): Promise<boolean> {
    if (!url || this.loadedImages.has(url) || this.failedImages.has(url)) {
      return this.loadedImages.has(url);
    }

    if (this.loadingImages.has(url)) {
      // 等待正在加载的图片
      return this.waitForImage(url);
    }

    this.loadingImages.add(url);

    try {
      const success = await this.loadImageWithTimeout(url);
      if (success) {
        this.loadedImages.add(url);
        console.log(`✅ [ImageCache] 图片预加载成功: ${url}`);
      } else {
        this.failedImages.add(url);
        console.warn(`❌ [ImageCache] 图片预加载失败: ${url}`);
      }
      return success;
    } catch (error) {
      this.failedImages.add(url);
      console.error(`❌ [ImageCache] 图片预加载错误: ${url}`, error);
      return false;
    } finally {
      this.loadingImages.delete(url);
    }
  }

  /**
   * 批量预加载图片
   */
  async preloadImages(urls: string[]): Promise<void> {
    const validUrls = urls.filter(url => url && !this.loadedImages.has(url) && !this.failedImages.has(url));
    
    if (validUrls.length === 0) {
      return;
    }

    console.log(`🔄 [ImageCache] 开始批量预加载 ${validUrls.length} 张图片`);

    // 分批处理，避免同时加载太多图片
    const batches = this.chunkArray(validUrls, this.maxConcurrentLoads);
    
    for (const batch of batches) {
      await Promise.allSettled(
        batch.map(url => this.preloadImage(url))
      );
    }

    console.log(`✅ [ImageCache] 批量预加载完成`);
  }

  /**
   * 检查图片是否已缓存
   */
  isImageCached(url: string): boolean {
    return this.loadedImages.has(url);
  }

  /**
   * 检查图片是否加载失败
   */
  isImageFailed(url: string): boolean {
    return this.failedImages.has(url);
  }

  /**
   * 重试失败的图片
   */
  retryFailedImage(url: string): Promise<boolean> {
    this.failedImages.delete(url);
    return this.preloadImage(url);
  }

  /**
   * 清除缓存记录（不清除浏览器缓存）
   */
  clearCache(): void {
    this.loadingImages.clear();
    this.loadedImages.clear();
    this.failedImages.clear();
    console.log('🗑️ [ImageCache] 缓存记录已清除');
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    return {
      loaded: this.loadedImages.size,
      failed: this.failedImages.size,
      loading: this.loadingImages.size,
    };
  }

  // 私有方法

  private loadImageWithTimeout(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      const img = new Image();
      let resolved = false;

      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          img.onload = null;
          img.onerror = null;
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        resolve(false);
      }, this.timeout);

      img.onload = () => {
        clearTimeout(timeout);
        cleanup();
        resolve(true);
      };

      img.onerror = () => {
        clearTimeout(timeout);
        cleanup();
        resolve(false);
      };

      // 开始加载图片，浏览器会自动缓存
      img.src = url;
    });
  }

  private async waitForImage(url: string): Promise<boolean> {
    // 等待图片加载完成
    while (this.loadingImages.has(url)) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return this.loadedImages.has(url);
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// 创建全局实例
export const imageCacheService = new ImageCacheService({
  maxConcurrentLoads: 3,
  timeout: 10000,
});

export default imageCacheService;

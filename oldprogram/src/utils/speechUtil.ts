/**
 * 语音播报工具类
 * 使用Web Speech API实现文本转语音功能
 */
export class SpeechUtil {
  private synthesis: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  private isEnabled: boolean = false;
  private queue: string[] = [];
  private isSpeaking: boolean = false;

  constructor() {
    if (this.isSupported()) {
      this.synthesis = window.speechSynthesis;
      this.initVoice();
    }
  }

  /**
   * 初始化语音
   */
  private initVoice() {
    // 等待语音列表加载完成
    const loadVoices = () => {
      const voices = this.synthesis.getVoices();
      // 优先选择中文语音
      this.voice = voices.find(voice => 
        voice.lang.includes('zh') || voice.lang.includes('CN')
      ) || voices[0] || null;
    };

    // 如果语音列表已经加载
    if (this.synthesis.getVoices().length > 0) {
      loadVoices();
    } else {
      // 等待语音列表加载事件
      this.synthesis.addEventListener('voiceschanged', loadVoices);
    }
  }

  /**
   * 检查浏览器是否支持语音合成
   */
  public isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  /**
   * 设置是否启用语音播报
   */
  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  /**
   * 获取是否启用语音播报
   */
  public getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 播报文本
   */
  public speak(text: string) {
    if (!this.isEnabled || !this.isSupported() || !text.trim() || !this.synthesis) {
      return;
    }

    // 限制文本长度，避免过长的文本
    const maxLength = 200;
    const trimmedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

    // 添加到队列
    this.queue.push(trimmedText);
    this.processQueue();
  }

  /**
   * 处理播报队列
   */
  private processQueue() {
    if (this.isSpeaking || this.queue.length === 0) {
      return;
    }

    const text = this.queue.shift();
    if (!text) return;

    this.isSpeaking = true;

    const utterance = new SpeechSynthesisUtterance(text);
    
    // 设置语音参数
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = 1.0; // 语速
    utterance.pitch = 1.0; // 音调
    utterance.volume = 0.8; // 音量

    // 播报结束事件
    utterance.onend = () => {
      this.isSpeaking = false;
      // 继续处理队列中的下一个
      setTimeout(() => this.processQueue(), 100);
    };

    // 播报错误事件
    utterance.onerror = (event) => {
      console.error('语音播报错误:', event.error);
      this.isSpeaking = false;
      // 继续处理队列中的下一个
      setTimeout(() => this.processQueue(), 100);
    };

    // 开始播报
    this.synthesis.speak(utterance);
  }

  /**
   * 停止播报
   */
  public stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.queue.length = 0;
    this.isSpeaking = false;
  }

  /**
   * 暂停播报
   */
  public pause() {
    if (this.synthesis.speaking) {
      this.synthesis.pause();
    }
  }

  /**
   * 恢复播报
   */
  public resume() {
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }
  }

  /**
   * 获取可用的语音列表
   */
  public getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis.getVoices();
  }

  /**
   * 设置语音
   */
  public setVoice(voice: SpeechSynthesisVoice) {
    this.voice = voice;
  }

  /**
   * 获取当前语音
   */
  public getCurrentVoice(): SpeechSynthesisVoice | null {
    return this.voice;
  }
}

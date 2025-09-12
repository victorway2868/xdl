import React, { useState, useRef, useEffect } from 'react';
import { Plus, Settings, Lock, Unlock, Loader2 } from 'lucide-react';
import '../styles/themes.css';

interface SoundEffect {
    id: string;
    name: string;
    hotkey: string;
    position: number;
    filePath?: string;
}





function AudioSettingsPage() {
    const [soundEffects, setSoundEffects] = useState<SoundEffect[]>([]);
    const [audioModalOpen, setAudioModalOpen] = useState(false);
    const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false);
    const [currentEffect, setCurrentEffect] = useState<SoundEffect | null>(null);
    const [isLocked, setIsLocked] = useState(false);
    const [draggedEffect, setDraggedEffect] = useState<SoundEffect | null>(null);
    const [availableAudioFiles, setAvailableAudioFiles] = useState<string[]>([]);
    const [playingEffect, setPlayingEffect] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    // Note: Session storage for update checking removed as auto-update is no longer needed

    // 创建默认的停止音效
    const createStopEffect = (): SoundEffect => ({
        id: 'stop-effect',
        name: '停止',
        hotkey: '',
        position: 0,
        filePath: undefined // 停止音效不需要文件路径
    });

    // 确保停止音效始终存在
    const ensureStopEffect = (effects: SoundEffect[]): SoundEffect[] => {
        const stopEffect = createStopEffect();
        const hasStopEffect = effects.some(effect => effect.id === 'stop-effect');

        if (!hasStopEffect) {
            // 如果没有停止音效，添加到第一位
            return [stopEffect, ...effects.map(effect => ({ ...effect, position: effect.position + 1 }))];
        } else {
            // 确保停止音效在第一位
            const otherEffects = effects.filter(effect => effect.id !== 'stop-effect');
            const existingStopEffect = effects.find(effect => effect.id === 'stop-effect');
            return [
                { ...stopEffect, hotkey: existingStopEffect?.hotkey || '' },
                ...otherEffects.map((effect, index) => ({ ...effect, position: index + 1 }))
            ];
        }
    };

    // Load saved sound effects on component mount
    useEffect(() => {
        const savedEffects = localStorage.getItem('soundEffects');
        let effects: SoundEffect[] = [];

        if (savedEffects) {
            effects = JSON.parse(savedEffects);
        }

        // 确保停止音效存在并在第一位
        effects = ensureStopEffect(effects);
        setSoundEffects(effects);

        const savedLockState = localStorage.getItem('soundEffectsLocked');
        if (savedLockState) {
            setIsLocked(savedLockState === 'true');
        }

        // Load available audio files
        loadAvailableAudioFiles().then(async (loadedFiles) => {
            try {
                // After loading files, decide whether to check server updates
                const hasLocalAudio = Array.isArray(loadedFiles) && loadedFiles.length > 0;
                const LAST_CHECK_KEY = 'soundPackLastCheckedAt';
                const lastCheckedAt = Number(localStorage.getItem(LAST_CHECK_KEY) || 0);
                const now = Date.now();
                const twelveHoursMs = 12 * 60 * 60 * 1000;

                // If no local files, check immediately. If has files, only check every 12h
                if (!hasLocalAudio || (now - lastCheckedAt) > twelveHoursMs) {
                    const packs = await window.electronAPI?.checkSoundPackUpdates?.();
                    if (packs && Array.isArray(packs.files) && packs.files.length > 0) {
                        // Download any packs that aren't present
                        const localPacks = await window.electronAPI?.getLocalSoundPacks?.();
                        const missingPacks = packs.files.filter((file: any) => {
                            const packName = (file?.name || '').trim();
                            const packUrl = (file?.url || '').trim();
                            if (!packName || !packUrl) return false;
                            return !(Array.isArray(localPacks) && localPacks.includes(packName));
                        });

                        if (missingPacks.length > 0) {
                            setIsUpdating(true);
                            try {
                                for (const file of missingPacks) {
                                    const packName = (file.name || '').trim();
                                    const packUrl = (file.url || '').trim();
                                    try {
                                        await window.electronAPI?.downloadSoundPack?.(packName, packUrl);
                                    } catch {}
                                }
                            } finally {
                                // Refresh audio list after potential downloads
                                const updatedFilesList = await window.electronAPI?.getAudioFiles?.() || [];
                                window.dispatchEvent(new CustomEvent('audioFilesUpdated', { detail: updatedFilesList }));
                                setIsUpdating(false);
                            }
                        }
                        // Refresh audio list after potential downloads
                        else {
                            const updatedFilesList = await window.electronAPI?.getAudioFiles?.() || [];
                            window.dispatchEvent(new CustomEvent('audioFilesUpdated', { detail: updatedFilesList }));
                        }
                    }
                    localStorage.setItem(LAST_CHECK_KEY, String(now));
                }
            } catch (err) {
                console.error('Sound pack update check failed:', err);
            }
        });

        // Note: Auto-update checking behavior adjusted: conditional and timed
    }, []);

    // Save sound effects when they change
    useEffect(() => {
        if (soundEffects.length > 0) {
            localStorage.setItem('soundEffects', JSON.stringify(soundEffects));
            // 通知 MainLayout 更新全局快捷键
            window.dispatchEvent(new CustomEvent('soundEffectsUpdated'));
        }
    }, [soundEffects]);

    // Save lock state when it changes
    useEffect(() => {
        localStorage.setItem('soundEffectsLocked', isLocked.toString());
    }, [isLocked]);

    // 注意：全局快捷键监听现在由 MainLayout 处理，这里只处理页面内的音效播放

    const loadAvailableAudioFiles = async (): Promise<string[]> => {
        try {
            // Get audio files from local sound effects folder
            const files = await window.electronAPI?.getAudioFiles?.() || [];
            setAvailableAudioFiles(files);
            return files;
        } catch (error) {
            console.error('Failed to load audio files:', error);
            return [];
        }
    };

    // Note: checkForSoundPackUpdates function removed as auto-update is no longer needed

    const handleAddAudio = (file: string) => {
        // Extract filename without extension
        const fileName = file.split('/').pop()?.split('.')[0] || file;

        const newEffect: SoundEffect = {
            id: Date.now().toString(),
            name: fileName,
            hotkey: '',
            position: soundEffects.length,
            filePath: file
        };

        const updatedEffects = [...soundEffects, newEffect];
        setSoundEffects(updatedEffects);
    };

    const handleSetHotkey = (hotkey: string) => {
        if (currentEffect) {
            setSoundEffects(soundEffects.map(effect =>
                effect.id === currentEffect.id ? { ...effect, hotkey } : effect
            ));
        }
    };

    // 使用全局音效播放机制，通过自定义事件与MainLayout通信
    const handlePlaySound = (effect: SoundEffect) => {
        // 触发全局音效播放事件，让MainLayout统一处理
        window.dispatchEvent(new CustomEvent('playSound', { 
            detail: { effect } 
        }));
        
        // 更新本地播放状态用于UI显示
        setPlayingEffect(effect.id === 'stop-effect' ? null : effect.id);
        
        // 如果是停止音效或者点击正在播放的音效，清除播放状态
        if (effect.id === 'stop-effect' || playingEffect === effect.id) {
            setPlayingEffect(null);
        }
    };

    // 监听全局音效播放状态变化
    useEffect(() => {
        const handleGlobalAudioStateChange = (event: CustomEvent) => {
            const { effectId, isPlaying } = event.detail;
            if (isPlaying) {
                setPlayingEffect(effectId);
            } else {
                setPlayingEffect(null);
            }
        };

        // 监听音频文件更新事件
        const handleAudioFilesUpdated = (event: CustomEvent) => {
            const updatedFiles = event.detail;
            setAvailableAudioFiles(updatedFiles);
        };

        window.addEventListener('globalAudioStateChange', handleGlobalAudioStateChange as EventListener);
        window.addEventListener('audioFilesUpdated', handleAudioFilesUpdated as EventListener);

        return () => {
            window.removeEventListener('globalAudioStateChange', handleGlobalAudioStateChange as EventListener);
            window.removeEventListener('audioFilesUpdated', handleAudioFilesUpdated as EventListener);
        };
    }, []);

    const handleDragStart = (effect: SoundEffect, e: React.DragEvent) => {
        if (isLocked || effect.id === 'stop-effect') return; // 停止音效不允许拖拽
        setDraggedEffect(effect);
        e.dataTransfer.setData('text/plain', effect.id);

        // For better drag visual
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5';
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        if (isLocked) return;
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1';
        }

        // Check if dragged outside container
        if (containerRef.current && draggedEffect && draggedEffect.id !== 'stop-effect') {
            const containerRect = containerRef.current.getBoundingClientRect();
            if (
                e.clientX < containerRect.left ||
                e.clientX > containerRect.right ||
                e.clientY < containerRect.top ||
                e.clientY > containerRect.bottom
            ) {
                // Remove the effect (but not stop effect)
                setSoundEffects(soundEffects.filter(effect => effect.id !== draggedEffect.id));
            }
        }

        setDraggedEffect(null);
    };

    const handleDragOver = (e: React.DragEvent) => {
        if (isLocked) return;
        e.preventDefault();
    };

    const handleDrop = (targetEffect: SoundEffect, e: React.DragEvent) => {
        if (isLocked) return;
        e.preventDefault();

        const draggedId = e.dataTransfer.getData('text/plain');
        if (draggedId === targetEffect.id) return;

        // 不允许拖拽到停止音效的位置，也不允许停止音效被拖拽
        if (targetEffect.id === 'stop-effect' || draggedId === 'stop-effect') return;

        const draggedIndex = soundEffects.findIndex(effect => effect.id === draggedId);
        const targetIndex = soundEffects.findIndex(effect => effect.id === targetEffect.id);

        if (draggedIndex !== -1 && targetIndex !== -1) {
            const newEffects = [...soundEffects];
            const [removed] = newEffects.splice(draggedIndex, 1);
            newEffects.splice(targetIndex, 0, removed);

            // Update positions
            const updatedEffects = newEffects.map((effect, index) => ({
                ...effect,
                position: index
            }));

            setSoundEffects(updatedEffects);
        }
    };

    return (
        <div className="h-full p-6 theme-page transition-colors duration-300">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <Settings size={28} className="text-blue-500" />
                        <h1 className="text-3xl font-bold m-0 bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                            音效设置
                        </h1>
                    </div>
                </div>
                {/* Center updating indicator */}
                <div className="flex-1 flex items-center justify-center select-none">
                    {isUpdating && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-200">
                            <Loader2 size={16} className="animate-spin" />
                            <span>正在更新音效...</span>
                        </div>
                    )}
                </div>
                
                {/* Lock Toggle Button - moved to header */}
                <button
                    className={`px-5 py-3 rounded-xl border-2 transition-colors text-xl font-semibold ${
                        isLocked 
                            ? 'bg-red-100 hover:bg-red-200 border-red-300 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/50 dark:border-red-700 dark:text-red-300' 
                            : 'bg-green-100 hover:bg-green-200 border-green-300 text-green-700 dark:bg-green-900/30 dark:hover:bg-green-900/50 dark:border-green-700 dark:text-green-300'
                    }`}
                    onClick={() => setIsLocked(!isLocked)}
                    title={isLocked ? '点击解锁音效排序' : '点击锁定音效排序'}
                >
                    {isLocked ? <Lock size={26} /> : <Unlock size={26} />}
                </button>
            </div>



            <div
                ref={containerRef}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
            >
                {soundEffects.map((effect) => (
                    <div
                        key={effect.id}
                        className={`sound-effect-card ${
                            effect.id === 'stop-effect' ? 'stop-effect' : ''
                        } ${playingEffect === effect.id ? 'playing' : ''}`}
                        draggable={!isLocked && effect.id !== 'stop-effect'} // 停止音效不可拖拽
                        onDragStart={(e) => handleDragStart(effect, e)}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(effect, e)}
                        onClick={() => handlePlaySound(effect)}
                    >
                        <div className="text-center">
                            <p className="text-xs font-medium truncate mb-1">
                                {effect.id === 'stop-effect' ? '🛑 ' : ''}{effect.name}
                            </p>
                            <p className="text-xs sound-effect-hotkey">{effect.hotkey || '无快捷键'}</p>
                        </div>

                        {!isLocked && (
                            <button
                                className="absolute top-1 right-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentEffect(effect);
                                    setHotkeyModalOpen(true);
                                }}
                            >
                                <Settings size={12} />
                            </button>
                        )}
                    </div>
                ))}

                <button
                    className="bg-gray-100 dark:bg-gray-800 rounded-lg p-2.5 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 h-[72px] border border-gray-300 dark:border-gray-700 border-dashed text-gray-600 dark:text-gray-400 transition-colors"
                    onClick={() => setAudioModalOpen(true)}
                >
                    <Plus size={20} />
                </button>
            </div>

            <AudioPreviewModal
                isOpen={audioModalOpen}
                onClose={() => setAudioModalOpen(false)}
                audioFiles={availableAudioFiles}
                onSelect={handleAddAudio}
            />

            <HotkeySettingModal
                isOpen={hotkeyModalOpen}
                onClose={() => setHotkeyModalOpen(false)}
                onApply={handleSetHotkey}
            />
        </div>
    );
}

// Audio Preview Modal Component
interface AudioPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    audioFiles: string[];
    onSelect: (file: string) => void;
}

const AudioPreviewModal: React.FC<AudioPreviewModalProps> = ({ isOpen, onClose, audioFiles, onSelect }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string>('');
    
    // Ensure OS-level drag events allow dropping files (avoid forbidden cursor in prod)
    useEffect(() => {
        if (!isOpen) return;
        const preventDefaultDrag = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'copy';
                }
            } catch {}
        };
        const handleWindowDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
        };
        window.addEventListener('dragover', preventDefaultDrag);
        window.addEventListener('drop', handleWindowDrop);
        document.addEventListener('dragover', preventDefaultDrag);
        document.addEventListener('drop', handleWindowDrop);
        return () => {
            window.removeEventListener('dragover', preventDefaultDrag);
            window.removeEventListener('drop', handleWindowDrop);
            document.removeEventListener('dragover', preventDefaultDrag);
            document.removeEventListener('drop', handleWindowDrop);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    // 验证音频文件格式
    const isValidAudioFile = (file: File): boolean => {
        const validTypes = ['audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/aac', 'audio/mpeg'];
        const validExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac'];
        
        return validTypes.includes(file.type) || 
               validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    };

    // 处理文件上传
    const handleFileUpload = async (files: FileList) => {
        setIsUploading(true);
        setUploadStatus('正在处理文件...');
        
        const audioFiles = Array.from(files).filter(isValidAudioFile);
        
        if (audioFiles.length === 0) {
            setUploadStatus('未找到有效的音频文件');
            setTimeout(() => {
                setUploadStatus('');
                setIsUploading(false);
            }, 2000);
            return;
        }

        let successCount = 0;
        let errorCount = 0;

        for (const file of audioFiles) {
            try {
                const result = await window.electronAPI?.copyAudioToCustomSounds?.(file.path);
                if (result?.success) {
                    successCount++;
                } else {
                    errorCount++;
                    console.error('Failed to copy file:', result?.error);
                }
            } catch (error) {
                errorCount++;
                console.error('Failed to upload file:', error);
            }
        }

        if (successCount > 0) {
            setUploadStatus(`成功添加 ${successCount} 个音频文件`);
            // 刷新音频文件列表
            setTimeout(async () => {
                try {
                    const updatedFiles = await window.electronAPI?.getAudioFiles?.() || [];
                    window.dispatchEvent(new CustomEvent('audioFilesUpdated', { detail: updatedFiles }));
                } catch (error) {
                    console.error('Failed to refresh audio files:', error);
                }
            }, 500);
        } else {
            setUploadStatus(`添加失败${errorCount > 0 ? ` (${errorCount} 个文件)` : ''}`);
        }

        setTimeout(() => {
            setUploadStatus('');
            setIsUploading(false);
        }, 3000);
    };

    // 拖拽事件处理
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // 只有当离开整个拖拽区域时才设置为false
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOver(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            e.dataTransfer.dropEffect = 'copy';
        } catch {}
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files);
        }
    };

    return (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div 
                className={`modal-content ${
                    isDragOver ? 'ring-2 ring-blue-500' : ''
                }`}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <div className="modal-header">
                    <h3 className="modal-title">
                        选择音频文件(支持拖拽音频文件到这里)
                    </h3>
                </div>
                
                {/* 上传状态显示 */}
                {(isUploading || uploadStatus) && (
                    <div className="mb-3 p-2 rounded-lg theme-bg-tertiary">
                        {isUploading && (
                            <div className="status-info text-sm animate-pulse text-center">
                                {uploadStatus}
                            </div>
                        )}
                        
                        {!isUploading && uploadStatus && (
                            <div className={`text-sm text-center ${
                                uploadStatus.includes('成功') 
                                    ? 'status-success' 
                                    : 'status-error'
                            }`}>
                                {uploadStatus}
                            </div>
                        )}
                    </div>
                )}

                {/* 拖拽悬停提示 */}
                {isDragOver && (
                    <div className="mb-3 p-3 border-2 border-dashed rounded-lg text-center theme-border-secondary" 
                         style={{ 
                             borderColor: 'var(--border-hover)', 
                             backgroundColor: 'var(--btn-ghost-bg)' 
                         }}>
                        <div className="status-info">
                            <div className="text-xl mb-1">🎵</div>
                            <p className="text-sm font-medium">释放文件以添加到音效库</p>
                            <p className="text-xs theme-text-muted">支持格式：MP3, WAV, OGG, M4A, AAC</p>
                        </div>
                    </div>
                )}

                {/* 音频文件列表 */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {audioFiles.length === 0 ? (
                        <div className="theme-text-empty">
                            <p>暂无可用音效文件</p>
                            <p className="text-sm mt-2">拖拽音频文件或更新音效包</p>
                        </div>
                    ) : (
                        audioFiles.map((file, index) => (
                            <div
                                key={index}
                                className="p-2 rounded cursor-pointer mb-1 flex items-center justify-between theme-text-primary transition-all hover:theme-bg-tertiary"
                                onClick={() => {
                                    onSelect(file);
                                    onClose();
                                }}
                                style={{ 
                                    backgroundColor: 'transparent',
                                    transition: 'background-color 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <span className="truncate">{file.split('/').pop()}</span>
                                <button
                                    className="ml-2 status-info hover:opacity-80 transition-opacity"
                                    onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                            const audioUrl = await window.electronAPI?.getAudioFileUrl?.(file);
                                            if (audioUrl) {
                                                const audio = new Audio(audioUrl);
                                                audio.play().catch(console.error);
                                            }
                                        } catch (error) {
                                            console.error('Failed to preview audio:', error);
                                        }
                                    }}
                                >
                                    播放
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="mt-4 flex justify-end">
                    <button
                        className="theme-btn-secondary"
                        onClick={onClose}
                    >
                        取消
                    </button>
                </div>
            </div>
        </div>
    );
};

// Hotkey Setting Modal Component
interface HotkeySettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onApply: (hotkey: string) => void;
}

const HotkeySettingModal: React.FC<HotkeySettingModalProps> = ({ isOpen, onClose, onApply }) => {
    const [currentHotkey, setCurrentHotkey] = useState('');
    const [isRecording, setIsRecording] = useState(false);

    // 打开模态框时自动开始录制
    useEffect(() => {
        if (isOpen) {
            setIsRecording(true);
            setCurrentHotkey('');
        }
    }, [isOpen]);

    // 使用全局键盘事件监听
    useEffect(() => {
        if (!isRecording || !isOpen) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            e.preventDefault();
            e.stopPropagation();

            // 忽略单独的修饰键
            if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
                return;
            }

            const keys: string[] = [];

            // 按固定顺序添加修饰键
            if (e.ctrlKey) keys.push('Ctrl');
            if (e.altKey) keys.push('Alt');
            if (e.shiftKey) keys.push('Shift');
            if (e.metaKey) keys.push('Meta');

            // 处理主键
            let keyName = e.key;
            
            // 处理小键盘按键
            if (e.code.startsWith('Numpad')) {
                if (e.code === 'NumpadEnter') keyName = 'NumpadEnter';
                else if (e.code === 'NumpadAdd') keyName = 'NumpadAdd';
                else if (e.code === 'NumpadSubtract') keyName = 'NumpadSubtract';
                else if (e.code === 'NumpadMultiply') keyName = 'NumpadMultiply';
                else if (e.code === 'NumpadDivide') keyName = 'NumpadDivide';
                else if (e.code === 'NumpadDecimal') keyName = 'NumpadDecimal';
                else if (e.code.match(/^Numpad\d$/)) {
                    // Numpad0-Numpad9
                    keyName = e.code; // 保持 Numpad0, Numpad1, ... Numpad9
                }
            }
            // 处理其他特殊键
            else if (keyName === ' ') keyName = 'Space';
            else if (keyName === 'ArrowUp') keyName = 'Up';
            else if (keyName === 'ArrowDown') keyName = 'Down';
            else if (keyName === 'ArrowLeft') keyName = 'Left';
            else if (keyName === 'ArrowRight') keyName = 'Right';
            else if (keyName === 'Enter') keyName = 'Enter';
            else if (keyName === 'Escape') keyName = 'Escape';
            else if (keyName === 'Tab') keyName = 'Tab';
            else if (keyName === 'Backspace') keyName = 'Backspace';
            else if (keyName === 'Delete') keyName = 'Delete';
            else if (keyName.startsWith('F') && keyName.length <= 3) keyName = keyName; // F1-F12
            else if (keyName.length === 1) keyName = keyName.toUpperCase();

            keys.push(keyName);

            const hotkeyString = keys.join('+');
            setCurrentHotkey(hotkeyString);

            // 自动停止录制
            setIsRecording(false);
        };

        // 添加全局事件监听器，使用 capture 模式确保优先捕获
        document.addEventListener('keydown', handleGlobalKeyDown, { capture: true });

        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
        };
    }, [isRecording, isOpen]);

    const resetState = () => {
        setCurrentHotkey('');
        setIsRecording(false);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}>
            <div className="modal-content">
                <div className="modal-header">
                    <h3 className="modal-title">设置快捷键</h3>
                </div>
                
                <div className="mb-3">
                    <div className="mb-3">
                        <div className={`p-4 rounded border text-center theme-bg-tertiary theme-text-primary ${
                            isRecording ? 'theme-border-secondary' : 'theme-border-primary'
                        }`} style={{
                            borderColor: isRecording ? 'var(--border-hover)' : 'var(--border-primary)',
                            backgroundColor: isRecording ? 'var(--btn-ghost-bg)' : 'var(--bg-tertiary)'
                        }}>
                            {currentHotkey ? (
                                <div className="text-lg font-medium">{currentHotkey}</div>
                            ) : (
                                <div className="theme-text-muted">
                                    {isRecording ? "按下任意键盘组合键..." : "等待录制..."}
                                </div>
                            )}
                        </div>
                    </div>

                    {isRecording && (
                        <div className="text-xs status-info mb-2 animate-pulse text-center">
                            🎯 正在录制快捷键，请按下键盘组合键...
                        </div>
                    )}

                    <div className="text-xs theme-text-muted text-center">
                        <div>💡 支持：F1-F12, Ctrl+A, Alt+F1, Shift+Space, 小键盘 等</div>
                    </div>
                </div>
                
                <div className="flex justify-end gap-2">
                    <button
                        className="theme-btn-secondary"
                        onClick={() => {
                            resetState();
                            onClose();
                        }}
                    >
                        取消
                    </button>
                    <button
                        className="theme-btn-primary"
                        disabled={!currentHotkey.trim()}
                        onClick={() => {
                            onApply(currentHotkey.trim());
                            resetState();
                            onClose();
                        }}
                        style={{
                            opacity: !currentHotkey.trim() ? 0.5 : 1,
                            cursor: !currentHotkey.trim() ? 'not-allowed' : 'pointer'
                        }}
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AudioSettingsPage;
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings, Lock, Unlock, Download, RefreshCw, Square } from 'lucide-react';

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
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState<string>('');
    const [playingEffect, setPlayingEffect] = useState<string | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    // Use sessionStorage to track if updates have been checked in this session
    const getHasCheckedUpdates = () => {
        return sessionStorage.getItem('audioUpdatesChecked') === 'true';
    };

    const setHasCheckedUpdates = () => {
        sessionStorage.setItem('audioUpdatesChecked', 'true');
    };

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
        loadAvailableAudioFiles();

        // Check for updates only on first visit per session
        if (!getHasCheckedUpdates()) {
            setHasCheckedUpdates();
            checkForSoundPackUpdates();
        }
    }, []);

    // Save sound effects when they change
    useEffect(() => {
        if (soundEffects.length > 0) {
            localStorage.setItem('soundEffects', JSON.stringify(soundEffects));
            // 同步更新全局快捷键
            updateGlobalHotkeys();
        }
    }, [soundEffects]);

    // 更新全局快捷键
    const updateGlobalHotkeys = async () => {
        try {
            await window.electronAPI?.updateGlobalHotkeys?.(soundEffects);
        } catch (error) {
            console.error('Failed to update global hotkeys:', error);
        }
    };

    // Save lock state when it changes
    useEffect(() => {
        localStorage.setItem('soundEffectsLocked', isLocked.toString());
    }, [isLocked]);

    // 监听来自主进程的快捷键触发
    useEffect(() => {
        const unsubscribe = window.electronAPI?.onHotkeyTriggered?.((payload) => {
            const { hotkey } = payload;
            // 找到对应的音效并播放（包括停止音效）
            const effect = soundEffects.find(e => e.hotkey === hotkey);
            if (effect) {
                handlePlaySound(effect);
            }
        });

        return () => {
            unsubscribe?.();
            // 组件卸载时清理全局快捷键
            window.electronAPI?.clearAllGlobalHotkeys?.();
        };
    }, [soundEffects]);

    const loadAvailableAudioFiles = async () => {
        try {
            // Get audio files from local sound effects folder
            const files = await window.electronAPI?.getAudioFiles?.() || [];
            setAvailableAudioFiles(files);
        } catch (error) {
            console.error('Failed to load audio files:', error);
        }
    };

    const checkForSoundPackUpdates = async () => {
        try {
            setIsUpdating(true);
            setUpdateStatus('检查音效包更新...');

            // Fetch sound packs info from server via main process
            const soundPacks = await window.electronAPI?.checkSoundPackUpdates?.();
            if (!soundPacks) {
                throw new Error('Failed to fetch sound packs info');
            }

            // Get list of existing local sound pack folders
            const localPacks = await window.electronAPI?.getLocalSoundPacks?.() || [];

            // Find packs that need to be downloaded
            const packsToDownload = soundPacks.files.filter(pack =>
                !localPacks.includes(pack.name)
            );

            if (packsToDownload.length === 0) {
                setUpdateStatus('所有音效包已是最新');
                setTimeout(() => {
                    setIsUpdating(false);
                    setUpdateStatus('');
                }, 2000);
                return;
            }

            setUpdateStatus(`发现 ${packsToDownload.length} 个新音效包，开始下载...`);

            // Download new packs
            let successCount = 0;
            for (const pack of packsToDownload) {
                setUpdateStatus(`正在下载: ${pack.name}...`);

                const success = await window.electronAPI?.downloadSoundPack?.(pack.name, pack.url);
                if (success) {
                    successCount++;
                } else {
                    console.error(`Failed to download sound pack: ${pack.name}`);
                }
            }

            setUpdateStatus(`音效包更新完成 (${successCount}/${packsToDownload.length})`);

            // Reload available audio files
            await loadAvailableAudioFiles();

            setTimeout(() => {
                setIsUpdating(false);
                setUpdateStatus('');
            }, 2000);

        } catch (error) {
            console.error('Failed to check for sound pack updates:', error);
            setUpdateStatus('更新检查失败: ' + (error as Error).message);
            setTimeout(() => {
                setIsUpdating(false);
                setUpdateStatus('');
            }, 3000);
        }
    };

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

    // 添加音频播放状态管理
    const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const playingEffectRef = useRef<string | null>(null);

    const handlePlaySound = async (effect: SoundEffect) => {
        // 如果是停止音效，只停止当前播放
        if (effect.id === 'stop-effect') {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current = null;
                setCurrentAudio(null);
                setPlayingEffect(null);
                playingEffectRef.current = null;
            }
            return;
        }

        if (!effect.filePath) return;

        try {
            // 停止当前播放的音频
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current.currentTime = 0;
                currentAudioRef.current = null;
                setCurrentAudio(null);
                setPlayingEffect(null);
                playingEffectRef.current = null;
            }

            // 如果点击的是正在播放的音效，则只停止播放
            if (playingEffectRef.current === effect.id) {
                return;
            }

            // 获取音频文件的完整路径
            const audioUrl = await window.electronAPI?.getAudioFileUrl?.(effect.filePath);
            if (!audioUrl) {
                console.error('Failed to get audio file URL:', effect.filePath);
                return;
            }

            // 创建新的音频对象
            const audio = new Audio(audioUrl);

            // 设置音频事件监听器
            audio.onloadstart = () => {
                setPlayingEffect(effect.id);
                setCurrentAudio(audio);
                currentAudioRef.current = audio;
                playingEffectRef.current = effect.id;
            };

            audio.onended = () => {
                setPlayingEffect(null);
                setCurrentAudio(null);
                currentAudioRef.current = null;
                playingEffectRef.current = null;
            };

            audio.onerror = (e) => {
                console.error('Audio playback error:', e);
                setPlayingEffect(null);
                setCurrentAudio(null);
                currentAudioRef.current = null;
                playingEffectRef.current = null;
            };

            // 开始播放
            await audio.play();

        } catch (error) {
            console.error('Failed to play sound:', error);
            setPlayingEffect(null);
            setCurrentAudio(null);
            currentAudioRef.current = null;
            playingEffectRef.current = null;
        }
    };

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
        <div className="h-full p-3 bg-gray-900 text-white">
            <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-semibold flex items-center">
                    <Settings className="w-4 h-4 mr-1.5 text-blue-400" />
                    主播音效
                </h2>
                <div className="flex items-center gap-2">
                    {isUpdating && (
                        <div className="flex items-center gap-2 text-sm text-blue-400">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>{updateStatus}</span>
                        </div>
                    )}
                    {playingEffect && (
                        <button
                            onClick={() => {
                                if (currentAudio) {
                                    currentAudio.pause();
                                    currentAudio.currentTime = 0;
                                    setCurrentAudio(null);
                                    setPlayingEffect(null);
                                }
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-sm bg-red-600 hover:bg-red-700 rounded"
                            title="停止播放"
                        >
                            <Square className="w-3 h-3" />
                            停止
                        </button>
                    )}
                    <button
                        onClick={checkForSoundPackUpdates}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-2 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded"
                    >
                        <Download className="w-3 h-3" />
                        更新音效包
                    </button>
                    <Link to="/app" className="text-indigo-400 hover:text-indigo-300 text-sm">返回首页</Link>
                    <button
                        className={`p-1.5 rounded-full ${isLocked ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
                        onClick={() => setIsLocked(!isLocked)}
                    >
                        {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                </div>
            </div>

            <div
                ref={containerRef}
                className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3"
            >
                {soundEffects.map((effect) => (
                    <div
                        key={effect.id}
                        className={`rounded-lg p-2.5 cursor-pointer relative border transition-all duration-200 ${effect.id === 'stop-effect'
                                ? 'bg-red-800 hover:bg-red-700 border-red-600' // 停止音效特殊样式
                                : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                            } ${playingEffect === effect.id ? 'bg-blue-700 border-blue-500 scale-105' : ''}`}
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
                            <p className="text-xs text-gray-400">{effect.hotkey || '无快捷键'}</p>
                        </div>

                        {!isLocked && (
                            <button
                                className="absolute top-1 right-1 text-gray-400 hover:text-white"
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
                    className="bg-gray-800 rounded-lg p-2.5 flex items-center justify-center hover:bg-gray-700 h-[72px] border border-gray-700 border-dashed"
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
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-96 max-w-full max-h-[80vh] flex flex-col">
                <h3 className="text-white font-medium mb-3">选择音频文件</h3>
                <div className="flex-1 overflow-y-auto">
                    {audioFiles.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                            <p>暂无可用音效文件</p>
                            <p className="text-sm mt-2">请先更新音效包</p>
                        </div>
                    ) : (
                        audioFiles.map((file, index) => (
                            <div
                                key={index}
                                className="p-2 hover:bg-gray-700 rounded cursor-pointer mb-1 flex items-center justify-between"
                                onClick={() => {
                                    onSelect(file);
                                    onClose();
                                }}
                            >
                                <span className="truncate">{file.split('/').pop()}</span>
                                <button
                                    className="ml-2 text-blue-400 hover:text-blue-300"
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
                        className="bg-gray-700 text-white px-4 py-2 rounded"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-4 w-96 max-w-full">
                <h3 className="text-white font-medium mb-3">设置快捷键</h3>
                <div className="mb-3">
                    <div className="mb-3">
                        <div className={`p-4 bg-gray-700 text-white rounded border text-center ${isRecording ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600'
                            }`}>
                            {currentHotkey ? (
                                <div className="text-lg font-medium">{currentHotkey}</div>
                            ) : (
                                <div className="text-gray-400">
                                    {isRecording ? "按下任意键盘组合键..." : "等待录制..."}
                                </div>
                            )}
                        </div>
                    </div>

                    {isRecording && (
                        <div className="text-xs text-blue-400 mb-2 animate-pulse text-center">
                            🎯 正在录制快捷键，请按下键盘组合键...
                        </div>
                    )}

                    <div className="text-xs text-gray-400 text-center">
                        <div>💡 支持：F1-F12, Ctrl+A, Alt+F1, Shift+Space, 小键盘 等</div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        className="bg-gray-700 text-white px-4 py-1 rounded"
                        onClick={() => {
                            resetState();
                            onClose();
                        }}
                    >
                        取消
                    </button>
                    <button
                        className="bg-blue-600 text-white px-4 py-1 rounded disabled:bg-gray-600"
                        disabled={!currentHotkey.trim()}
                        onClick={() => {
                            onApply(currentHotkey.trim());
                            resetState();
                            onClose();
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
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Settings, Lock, Unlock } from 'lucide-react';

function AudioSettingsPage() {
  const [soundEffects, setSoundEffects] = useState([]);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [hotkeyModalOpen, setHotkeyModalOpen] = useState(false);
  const [currentEffect, setCurrentEffect] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [draggedEffect, setDraggedEffect] = useState(null);

  // Mock audio files
  const audioFiles = [
    'xldmusic/audio1.mp3',
    'xldmusic/audio2.mp3',
    'xldmusic/audio3.mp3',
    'xldmusic/audio4.mp3',
    'xldmusic/audio5.mp3',
  ];

  const containerRef = useRef(null);

  // Load saved sound effects on component mount
  useEffect(() => {
    const savedEffects = localStorage.getItem('soundEffects');
    if (savedEffects) {
      setSoundEffects(JSON.parse(savedEffects));
    }

    const savedLockState = localStorage.getItem('soundEffectsLocked');
    if (savedLockState) {
      setIsLocked(savedLockState === 'true');
    }
  }, []);

  // Save sound effects when they change
  useEffect(() => {
    if (soundEffects.length > 0) {
      localStorage.setItem('soundEffects', JSON.stringify(soundEffects));
    }
  }, [soundEffects]);

  // Save lock state when it changes
  useEffect(() => {
    localStorage.setItem('soundEffectsLocked', isLocked.toString());
  }, [isLocked]);

  const handleAddAudio = (file) => {
    // Extract filename without extension
    const fileName = file.split('/').pop()?.split('.')[0] || file;

    const newEffect = {
      id: Date.now().toString(),
      name: fileName,
      hotkey: '',
      position: soundEffects.length
    };

    const updatedEffects = [...soundEffects, newEffect];
    setSoundEffects(updatedEffects);
  };

  const handleSetHotkey = (hotkey) => {
    if (currentEffect) {
      setSoundEffects(soundEffects.map(effect =>
        effect.id === currentEffect.id ? { ...effect, hotkey } : effect
      ));
    }
  };

  const handleDragStart = (effect, e) => {
    if (isLocked) return;
    setDraggedEffect(effect);
    e.dataTransfer.setData('text/plain', effect.id);

    // For better drag visual
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '0.5';
    }
  };

  const handleDragEnd = (e) => {
    if (isLocked) return;
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = '1';
    }

    // Check if dragged outside container
    if (containerRef.current && draggedEffect) {
      const containerRect = containerRef.current.getBoundingClientRect();
      if (
        e.clientX < containerRect.left ||
        e.clientX > containerRect.right ||
        e.clientY < containerRect.top ||
        e.clientY > containerRect.bottom
      ) {
        // Remove the effect
        setSoundEffects(soundEffects.filter(effect => effect.id !== draggedEffect.id));
      }
    }

    setDraggedEffect(null);
  };

  const handleDragOver = (e) => {
    if (isLocked) return;
    e.preventDefault();
  };

  const handleDrop = (targetEffect, e) => {
    if (isLocked) return;
    e.preventDefault();

    const draggedId = e.dataTransfer.getData('text/plain');
    if (draggedId === targetEffect.id) return;

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

  // 由于我们暂时没有这些组件，先用简化的模态框代替
  const AudioPreviewModal = ({ isOpen, onClose, audioFiles, onSelect }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-4 w-96 max-w-full">
          <h3 className="text-white font-medium mb-3">选择音频文件</h3>
          <div className="max-h-96 overflow-y-auto">
            {audioFiles.map((file, index) => (
              <div 
                key={index} 
                className="p-2 hover:bg-gray-700 rounded cursor-pointer mb-1"
                onClick={() => {
                  onSelect(file);
                  onClose();
                }}
              >
                {file.split('/').pop()}
              </div>
            ))}
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
  
  const HotkeySettingModal = ({ isOpen, onClose, onApply }) => {
    const [currentHotkey, setCurrentHotkey] = useState('');
    
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-4 w-96 max-w-full">
          <h3 className="text-white font-medium mb-3">设置快捷键</h3>
          <div className="mb-3">
            <input
              type="text"
              placeholder="按下键盘组合键"
              className="w-full p-2 bg-gray-700 text-white rounded border border-gray-600"
              value={currentHotkey}
              onChange={(e) => setCurrentHotkey(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button 
              className="bg-gray-700 text-white px-4 py-1 rounded"
              onClick={onClose}
            >
              取消
            </button>
            <button 
              className="bg-blue-600 text-white px-4 py-1 rounded"
              onClick={() => {
                onApply(currentHotkey);
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

  return (
    <div className="h-full p-3 bg-gray-900 text-white">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-base font-semibold flex items-center">
          <Settings className="w-4 h-4 mr-1.5 text-blue-400" />
          主播音效
        </h2>
        <div className="flex items-center gap-2">
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
            className="bg-gray-800 rounded-lg p-2.5 cursor-pointer hover:bg-gray-700 relative border border-gray-700"
            draggable={!isLocked}
            onDragStart={(e) => handleDragStart(effect, e)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(effect, e)}
          >
            <div className="text-center">
              <p className="text-xs font-medium truncate mb-1">{effect.name}</p>
              <p className="text-xs text-gray-400">{effect.hotkey || '无快捷键'}</p>
            </div>

            {!isLocked && (
              <button
                className="absolute top-1 right-1 text-gray-400 hover:text-white"
                onClick={() => {
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
        audioFiles={audioFiles}
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

export default AudioSettingsPage;
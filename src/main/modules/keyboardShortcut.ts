import { spawn } from 'child_process';
import { getStartLiveHotkey, getEndLiveHotkey } from './douyinHotkey';

// 将键码转换为虚拟键码
function getVirtualKeyCode(keyCode: string): number {
  const map: Record<string, number> = {
    // 修饰键
    Ctrl: 0x11, Control: 0x11, ControlLeft: 0x11, ControlRight: 0x11,
    Shift: 0x10, ShiftLeft: 0x10, ShiftRight: 0x10,
    Alt: 0x12, AltLeft: 0x12, AltRight: 0x12,
    Meta: 0x5B, MetaLeft: 0x5B, MetaRight: 0x5C,
    
    // 字母键
    A: 0x41, B: 0x42, C: 0x43, D: 0x44, E: 0x45, F: 0x46, G: 0x47, H: 0x48, I: 0x49, J: 0x4A, K: 0x4B, L: 0x4C, M: 0x4D, N: 0x4E, O: 0x4F, P: 0x50, Q: 0x51, R: 0x52, S: 0x53, T: 0x54, U: 0x55, V: 0x56, W: 0x57, X: 0x58, Y: 0x59, Z: 0x5A,
    KeyA: 0x41, KeyB: 0x42, KeyC: 0x43, KeyD: 0x44, KeyE: 0x45, KeyF: 0x46, KeyG: 0x47, KeyH: 0x48, KeyI: 0x49, KeyJ: 0x4A, KeyK: 0x4B, KeyL: 0x4C, KeyM: 0x4D, KeyN: 0x4E, KeyO: 0x4F, KeyP: 0x50, KeyQ: 0x51, KeyR: 0x52, KeyS: 0x53, KeyT: 0x54, KeyU: 0x55, KeyV: 0x56, KeyW: 0x57, KeyX: 0x58, KeyY: 0x59, KeyZ: 0x5A,
    
    // 数字键
    0: 0x30, 1: 0x31, 2: 0x32, 3: 0x33, 4: 0x34, 5: 0x35, 6: 0x36, 7: 0x37, 8: 0x38, 9: 0x39,
    Digit0: 0x30, Digit1: 0x31, Digit2: 0x32, Digit3: 0x33, Digit4: 0x34, Digit5: 0x35, Digit6: 0x36, Digit7: 0x37, Digit8: 0x38, Digit9: 0x39,
    
    // 功能键
    F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75, F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,
    
    // 特殊键
    Space: 0x20, Enter: 0x0D, Escape: 0x1B, Tab: 0x09, Backspace: 0x08, Delete: 0x2E,
    Up: 0x26, Down: 0x28, Left: 0x25, Right: 0x27,
    
    // 小键盘
    Numpad0: 0x60, Numpad1: 0x61, Numpad2: 0x62, Numpad3: 0x63, Numpad4: 0x64, Numpad5: 0x65, Numpad6: 0x66, Numpad7: 0x67, Numpad8: 0x68, Numpad9: 0x69,
    NumpadAdd: 0x6B, NumpadSubtract: 0x6D, NumpadMultiply: 0x6A, NumpadDivide: 0x6F, NumpadDecimal: 0x6E, NumpadEnter: 0x0D,
  };
  return map[keyCode] ?? 0;
}

// 执行键盘快捷键的核心函数 - 使用高效的 keybd_event 方法
async function executeKeyboardShortcut(keys: string[]): Promise<void> {
  const vkCodes = keys.map(getVirtualKeyCode);
  const keyDownCommands = vkCodes.map(code =>
    `[Keyboard]::keybd_event(0x${code.toString(16).toUpperCase()}, 0, [Keyboard]::KEYEVENTF_KEYDOWN, 0)`
  );
  const keyUpCommands = [...vkCodes].reverse().map(code =>
    `[Keyboard]::keybd_event(0x${code.toString(16).toUpperCase()}, 0, [Keyboard]::KEYEVENTF_KEYUP, 0)`
  );

  const psScript = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Keyboard {
    [DllImport("user32.dll", SetLastError=true)]
    public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);

    public const int KEYEVENTF_KEYDOWN = 0x0000;
    public const int KEYEVENTF_KEYUP   = 0x0002;
}
"@

# 按下所有键
${keyDownCommands.map(cmd => `${cmd}\nStart-Sleep -Milliseconds 50`).join('\n')}

# 释放所有键（反序）
${keyUpCommands.map(cmd => `${cmd}\nStart-Sleep -Milliseconds 50`).join('\n')}
`;

  await new Promise<void>((resolve, reject) => {
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', psScript]);
    let stderr = '';
    ps.stderr.on('data', (d) => { stderr += String(d); });
    ps.on('error', (err) => reject(err));
    ps.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`PowerShell exited with code ${code}: ${stderr}`));
    });
  });
}

export async function executeStartLiveHotkey(): Promise<void> {
  const hk = await getStartLiveHotkey();
  console.log('executeStartLiveHotkey', hk);

  const keys = hk.code || ['ControlLeft', 'ShiftLeft', 'KeyL'];
  await executeKeyboardShortcut(keys);
}

export async function executeEndLiveHotkey(): Promise<void> {
  const hk = await getEndLiveHotkey();
  console.log('executeEndLiveHotkey', hk);

  const keys = hk.code || ['ShiftLeft', 'KeyL'];
  await executeKeyboardShortcut(keys);
}

// 执行自定义快捷键
export async function executeCustomHotkey(keys: string[]): Promise<void> {
  console.log('executeCustomHotkey', keys);
  await executeKeyboardShortcut(keys);
}
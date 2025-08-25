import { spawn } from 'child_process';
import { getStartLiveHotkey, getEndLiveHotkey } from './douyinHotkey';

// 将键码转换为虚拟键码
function getVirtualKeyCode(keyCode: string): number {
  const map: Record<string, number> = {
    ControlLeft: 0x11, ControlRight: 0x11,
    ShiftLeft: 0x10, ShiftRight: 0x10,
    AltLeft: 0x12, AltRight: 0x12,
    MetaLeft: 0x5B, MetaRight: 0x5C,
    KeyA: 0x41, KeyB: 0x42, KeyC: 0x43, KeyD: 0x44, KeyE: 0x45, KeyF: 0x46, KeyG: 0x47, KeyH: 0x48, KeyI: 0x49, KeyJ: 0x4A, KeyK: 0x4B, KeyL: 0x4C, KeyM: 0x4D, KeyN: 0x4E, KeyO: 0x4F, KeyP: 0x50, KeyQ: 0x51, KeyR: 0x52, KeyS: 0x53, KeyT: 0x54, KeyU: 0x55, KeyV: 0x56, KeyW: 0x57, KeyX: 0x58, KeyY: 0x59, KeyZ: 0x5A,
    Digit0: 0x30, Digit1: 0x31, Digit2: 0x32, Digit3: 0x33, Digit4: 0x34, Digit5: 0x35, Digit6: 0x36, Digit7: 0x37, Digit8: 0x38, Digit9: 0x39,
    F1: 0x70, F2: 0x71, F3: 0x72, F4: 0x73, F5: 0x74, F6: 0x75, F7: 0x76, F8: 0x77, F9: 0x78, F10: 0x79, F11: 0x7A, F12: 0x7B,
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
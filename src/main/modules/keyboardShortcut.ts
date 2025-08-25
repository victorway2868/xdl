import { spawn } from 'child_process';
import { getStartLiveHotkey } from './douyinHotkey';

// 将快捷键字符串转换为 SendKeys 格式，如 Ctrl+Shift+L -> ^+L
function acceleratorToSendKeys(accelerator: string): string {
  return (accelerator || '')
    .replace(/Ctrl/gi, '^')
    .replace(/Shift/gi, '+')
    .replace(/Alt/gi, '%')
    .replace(/\+/g, '')
    .replace(/\s/g, '');
}

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

export async function executeStartLiveHotkey(): Promise<void> {
  const hk = await getStartLiveHotkey();
  console.log('executeStartLiveHotkey', hk);
  const sendKeys = acceleratorToSendKeys(hk.accelerator || 'Ctrl+Shift+L');

  const vkCodes = (hk.code || ['ControlLeft', 'ShiftLeft', 'KeyL']).map(getVirtualKeyCode);
  const vkArray = vkCodes.map(c => `0x${c.toString(16).toUpperCase()}`).join(', ');

  // 与旧项目保持一致：优先聚焦“本应用窗口”（小斗笠直播助手），然后 Win32 键盘注入，最后 SendKeys 兜底
  const appName = '小斗笠直播助手';
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.Text;

public class WindowManager
{
    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);

    private delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    private const int SW_RESTORE = 9;
    private const int SW_SHOW = 5;
    private const int KEYEVENTF_EXTENDEDKEY = 0x1;
    private const int KEYEVENTF_KEYUP = 0x2;

    public static bool FocusApplicationWindow(string processNameOrTitle)
    {
        bool found = false;
        // 1) 枚举进程
        foreach (Process process in Process.GetProcesses())
        {
            try
            {
                if (process.ProcessName.ToLower().Contains("electron") || (process.ProcessName.ToLower().Contains(processNameOrTitle.ToLower())))
                {
                    IntPtr h = process.MainWindowHandle;
                    if (h != IntPtr.Zero)
                    {
                        ShowWindow(h, SW_RESTORE);
                        SetForegroundWindow(h);
                        found = true;
                        break;
                    }
                }
            }
            catch { }
        }
        // 2) 若未找到，枚举窗口标题
        if (!found)
        {
            EnumWindows(new EnumWindowsProc((hWnd, lParam) => {
                StringBuilder sb = new StringBuilder(512);
                GetWindowText(hWnd, sb, sb.Capacity);
                var title = sb.ToString();
                if (!string.IsNullOrEmpty(title) && title.Contains(processNameOrTitle))
                {
                    ShowWindow(hWnd, SW_RESTORE);
                    SetForegroundWindow(hWnd);
                    found = true;
                    return false; // stop
                }
                return true; // continue
            }), IntPtr.Zero);
        }
        return found;
    }

    public static void SendKeyCombination(byte[] keys)
    {
        // 按下
        foreach (byte k in keys)
        {
            keybd_event(k, 0, KEYEVENTF_EXTENDEDKEY, 0);
            System.Threading.Thread.Sleep(50);
        }
        // 释放（反序）
        for (int i = keys.Length - 1; i >= 0; i--)
        {
            keybd_event(keys[i], 0, KEYEVENTF_EXTENDEDKEY | KEYEVENTF_KEYUP, 0);
            System.Threading.Thread.Sleep(50);
        }
    }
}
"@

# 1) 尝试聚焦当前应用窗口（与旧项目一致）
$appTitle = '${appName}'
$focused = [WindowManager]::FocusApplicationWindow($appTitle)
Start-Sleep -Milliseconds 300

# 2) 使用 Win32 方式发送组合键
[WindowManager]::SendKeyCombination(@(${vkArray}))
Start-Sleep -Milliseconds 300

# 3) 兜底再用 SendKeys 发送一次
[System.Windows.Forms.SendKeys]::SendWait('${sendKeys}')
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


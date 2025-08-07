; 自定义安装脚本 - 设置快捷方式图标
; 这个脚本会在安装过程中被调用，用于创建带有正确图标的快捷方式

!macro customInstall
  ; 获取应用程序路径
  StrCpy $0 "$INSTDIR\小斗笠直播助手.exe"
  
  ; 获取图标路径 - 使用应用程序内置图标
  StrCpy $1 "$INSTDIR\resources\public\icons\icon-48x48.ico"
  
  ; 如果图标文件不存在，使用可执行文件本身的图标
  IfFileExists "$1" icon_exists
    StrCpy $1 "$0"
  icon_exists:
  
  ; 创建桌面快捷方式（如果用户选择了）
  ${If} $createDesktopShortcut == "true"
    CreateShortCut "$DESKTOP\小斗笠直播助手.lnk" "$0" "" "$1" 0
  ${EndIf}
  
  ; 创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\小斗笠直播助手"
  CreateShortCut "$SMPROGRAMS\小斗笠直播助手\小斗笠直播助手.lnk" "$0" "" "$1" 0
  CreateShortCut "$SMPROGRAMS\小斗笠直播助手\卸载小斗笠直播助手.lnk" "$INSTDIR\Uninstall 小斗笠直播助手.exe"
!macroend

!macro customUnInstall
  ; 删除快捷方式
  Delete "$DESKTOP\小斗笠直播助手.lnk"
  Delete "$SMPROGRAMS\小斗笠直播助手\小斗笠直播助手.lnk"
  Delete "$SMPROGRAMS\小斗笠直播助手\卸载小斗笠直播助手.lnk"
  RMDir "$SMPROGRAMS\小斗笠直播助手"
!macroend

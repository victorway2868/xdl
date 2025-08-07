!macro preInit
  ; Set default installation directory to $LOCALAPPDATA\Programs\xdlwebcast
  SetRegView 64
  StrCpy $INSTDIR "$LOCALAPPDATA\Programs\xdlwebcast"

  ; 设置为带进度条的静默安装
  SetSilent normal
!macroend

!macro customInstall
  ; Add registry key to run as administrator
  WriteRegStr HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "RUNASADMIN"
  WriteRegStr HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "RUNASADMIN"

  ; 创建带有正确图标的快捷方式
  ; 桌面快捷方式
  ${If} ${FileExists} "$INSTDIR\resources\public\icons\icon-48x48.ico"
    CreateShortCut "$DESKTOP\小斗笠直播助手.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\public\icons\icon-48x48.ico" 0
  ${Else}
    CreateShortCut "$DESKTOP\小斗笠直播助手.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}

  ; 开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\小斗笠直播助手"
  ${If} ${FileExists} "$INSTDIR\resources\public\icons\icon-32x32.ico"
    CreateShortCut "$SMPROGRAMS\小斗笠直播助手\小斗笠直播助手.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\resources\public\icons\icon-32x32.ico" 0
  ${Else}
    CreateShortCut "$SMPROGRAMS\小斗笠直播助手\小斗笠直播助手.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
  ${EndIf}
  CreateShortCut "$SMPROGRAMS\小斗笠直播助手\卸载小斗笠直播助手.lnk" "$INSTDIR\Uninstall 小斗笠直播助手.exe"

  ; Force refresh of desktop and start menu icons
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'

  ; 安装完成后自动启动应用程序
  Exec '"$INSTDIR\${APP_EXECUTABLE_FILENAME}"'
!macroend

!macro customUnInstall
  ; Clean up registry entries
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
  DeleteRegValue HKLM "Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers" "$INSTDIR\${APP_EXECUTABLE_FILENAME}"

  ; 删除快捷方式
  Delete "$DESKTOP\小斗笠直播助手.lnk"
  Delete "$SMPROGRAMS\小斗笠直播助手\小斗笠直播助手.lnk"
  Delete "$SMPROGRAMS\小斗笠直播助手\卸载小斗笠直播助手.lnk"
  RMDir "$SMPROGRAMS\小斗笠直播助手"

  ; Force refresh of desktop and start menu icons
  System::Call 'shell32.dll::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend

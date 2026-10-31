!macro NSIS_HOOK_POSTINSTALL
  ; Register "Open with Lunoite" in Windows Explorer context menu for Markdown files
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.md\shell\Open with Lunoite" "" "Open with Lunoite"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.md\shell\Open with Lunoite" "Icon" "$INSTDIR\lunoite.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.md\shell\Open with Lunoite\command" "" '"$INSTDIR\lunoite.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.markdown\shell\Open with Lunoite" "" "Open with Lunoite"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.markdown\shell\Open with Lunoite" "Icon" "$INSTDIR\lunoite.exe,0"
  WriteRegStr HKCU "Software\Classes\SystemFileAssociations\.markdown\shell\Open with Lunoite\command" "" '"$INSTDIR\lunoite.exe" "%1"'

  ; Register in Applications and OpenWithList
  WriteRegStr HKCU "Software\Classes\Applications\lunoite.exe\SupportedTypes" ".md" ""
  WriteRegStr HKCU "Software\Classes\Applications\lunoite.exe\SupportedTypes" ".markdown" ""
  WriteRegStr HKCU "Software\Classes\Applications\lunoite.exe\shell\open\command" "" '"$INSTDIR\lunoite.exe" "%1"'

  WriteRegStr HKCU "Software\Classes\.md\OpenWithList\lunoite.exe" "" ""
  WriteRegStr HKCU "Software\Classes\.markdown\OpenWithList\lunoite.exe" "" ""

  ; Notify Windows Explorer to refresh file associations
  System::Call 'shell32::SHChangeNotify(i, i, i, i) (0x08000000, 0, 0, 0)'
!macroend

!macro NSIS_HOOK_PREUNINSTALL
  ; Uninstaller: Clean up all Windows Explorer context menu entries and OpenWith registrations
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.md\shell\Open with Lunoite"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.markdown\shell\Open with Lunoite"
  DeleteRegKey HKCU "Software\Classes\Applications\lunoite.exe"
  DeleteRegKey HKCU "Software\Classes\.md\OpenWithList\lunoite.exe"
  DeleteRegKey HKCU "Software\Classes\.markdown\OpenWithList\lunoite.exe"

  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\.md\shell\Open with Lunoite"
  DeleteRegKey HKLM "Software\Classes\SystemFileAssociations\.markdown\shell\Open with Lunoite"
  DeleteRegKey HKLM "Software\Classes\Applications\lunoite.exe"
  DeleteRegKey HKLM "Software\Classes\.md\OpenWithList\lunoite.exe"
  DeleteRegKey HKLM "Software\Classes\.markdown\OpenWithList\lunoite.exe"

  ; Notify Windows Explorer to refresh file associations immediately
  System::Call 'shell32::SHChangeNotify(i, i, i, i) (0x08000000, 0, 0, 0)'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  ; Final uninstaller cleanup pass
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.md\shell\Open with Lunoite"
  DeleteRegKey HKCU "Software\Classes\SystemFileAssociations\.markdown\shell\Open with Lunoite"
  DeleteRegKey HKCU "Software\Classes\Applications\lunoite.exe"
  DeleteRegKey HKCU "Software\Classes\.md\OpenWithList\lunoite.exe"
  DeleteRegKey HKCU "Software\Classes\.markdown\OpenWithList\lunoite.exe"

  System::Call 'shell32::SHChangeNotify(i, i, i, i) (0x08000000, 0, 0, 0)'
!macroend

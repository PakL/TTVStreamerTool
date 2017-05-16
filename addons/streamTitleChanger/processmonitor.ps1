Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  using System.Text;


  public class KernelWindows {
    [Flags]
    public enum ProcessAccessFlags : uint
    {
      All = 0x001F0FFF,
      Terminate = 0x00000001,
      CreateThread = 0x00000002,
      VMOperation = 0x00000008,
      VMRead = 0x00000010,
      VMWrite = 0x00000020,
      DupHandle = 0x00000040,
      SetInformation = 0x00000200,
      QueryInformation = 0x00000400,
      QueryLimitedInformation = 0x00001000,
      Synchronize = 0x00100000,
      ReadControl = 0x00020000
    }

    [DllImport("kernel32.dll")]
    public static extern bool QueryFullProcessImageName(IntPtr hprocess, int dwFlags, StringBuilder lpExeName, out int size);
    [DllImport("kernel32.dll")]
    public static extern IntPtr OpenProcess(ProcessAccessFlags dwDesiredAccess, bool bInheritHandle, int dwProcessId);
    [DllImport("kernel32.dll", SetLastError = true)]
    public static extern bool CloseHandle(IntPtr hHandle);
}
"@
Add-Type @"
  using System;
  using System.Runtime.InteropServices;
  public class UserWindows {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
}
"@
  $buffer = New-Object -TypeName "System.Text.StringBuilder" -ArgumentList 1024

while(0 -ne 1) {

  try {
    $ActiveHandle = [UserWindows]::GetForegroundWindow()
    $Process = Get-Process | ? {$_.MainWindowHandle -eq $ActiveHandle}
    $hprocess = [KernelWindows]::OpenProcess("QueryLimitedInformation", "false", $Process.Id);
    $pidpath = ""
    if([KernelWindows]::QueryFullProcessImageName($hprocess, "0", $buffer, [ref] $buffer.Capacity)) {
      Write-Host -NoNewline $buffer.ToString()
    }
    [KernelWindows]::CloseHandle($hprocess) | Out-Null
    Start-Sleep -m 1000
  } catch {
    Write-Error $_
  }
}
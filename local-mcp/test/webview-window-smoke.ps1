param([Parameter(Mandatory=$true)][int]$AppPid)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$process = Get-Process -Id $AppPid
$all = [System.Windows.Automation.TreeScope]::Descendants
$any = [System.Windows.Automation.Condition]::TrueCondition

function Get-Window {
    $process.Refresh()
    if ($process.HasExited) { throw "Assistant exited with code $($process.ExitCode)" }
    return [System.Windows.Automation.AutomationElement]::FromHandle($process.MainWindowHandle)
}
function Find-Control([string]$label) {
    for ($i=0; $i -lt 30; $i++) {
        $elements = (Get-Window).FindAll($all, $any)
        foreach ($item in $elements) {
            if ($item.Current.Name -like "$label*") { return $item }
        }
        Start-Sleep -Milliseconds 500
    }
    $visible = $elements | ForEach-Object { $_.Current.Name } | Where-Object { $_ } | Select-Object -First 45
    throw "Cannot find '$label' in '$($process.MainWindowTitle)'. Visible controls: $($visible -join ' | ')"
}
function Press([string]$label) {
    $control = Find-Control $label
    $pattern = $null
    if ($control.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$pattern)) {
        $pattern.Invoke()
    } elseif ($control.TryGetCurrentPattern([System.Windows.Automation.ExpandCollapsePattern]::Pattern, [ref]$pattern)) {
        $pattern.Expand()
    } else { throw "Control cannot be activated: $label" }
}
try {
    $null = Find-Control '后台运行中'
    Press '连接网页'
    $null = Find-Control '关闭，回到网页配对'
    Press '关闭，回到网页配对'
    Press '连接 Agent'
    Press '其他 Agent'
    Press '复制 MCP 配置'
    for ($i=0; $i -lt 20; $i++) {
        $text = Get-Clipboard -Raw
        if ($text -and $text.Contains('mcpServers')) {break}
        Start-Sleep -Milliseconds 250
    }
    $config = $text | ConvertFrom-Json
    if (!(Test-Path $config.mcpServers.bookleap.command)) {throw 'Copied runtime path is invalid'}
    Press '测试连接'
    $null = Find-Control '实际 SDK stdio 工具测试成功'
    Write-Host 'WebView2 showed live status, pairing, clipboard configuration and a successful MCP query.'
} catch {
    Get-Process -Id $AppPid | Format-List Id,MainWindowTitle,MainWindowHandle,Responding
    Get-Process msedgewebview2 -ErrorAction SilentlyContinue | Select-Object Id,ProcessName | Format-Table
    throw
}

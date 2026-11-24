// Run on the CI desktop while the freshly installed assistant is frontmost.
import CoreGraphics
import Foundation

let pid = Int(CommandLine.arguments[1])!
func mainWindow() -> CGRect? {
    let windows = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
    for window in windows where window[kCGWindowOwnerPID as String] as? Int == pid && window[kCGWindowLayer as String] as? Int == 0 {
        if let bounds = window[kCGWindowBounds as String] as? NSDictionary {
            return CGRect(dictionaryRepresentation: bounds)
        }
    }
    return nil
}
guard let bounds = mainWindow() else { fatalError("Expected a visible assistant window") }
let close = CGPoint(x: bounds.minX + 14, y: bounds.minY + 14)
for type in [CGEventType.mouseMoved, .leftMouseDown, .leftMouseUp] {
    CGEvent(mouseEventSource: nil, mouseType: type, mouseCursorPosition: close, mouseButton: .left)?.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.1)
}
for _ in 0..<30 {
    if mainWindow() == nil { print("Closed the visible WebView window"); exit(0) }
    Thread.sleep(forTimeInterval: 0.1)
}
fatalError("Mac window is still visible after closing")

import UIKit
import Capacitor

class FRANViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        // Make WebView extend edge-to-edge under safe areas
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.bounces = false
    }

    // Show status bar with dark text (for white background)
    override var prefersStatusBarHidden: Bool {
        return false
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        return .darkContent
    }
}

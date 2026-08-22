import Capacitor
import UIKit

class HdlBridgeViewController: CAPBridgeViewController {
    private var launchOverlay: UIImageView?
    private var didScheduleLaunchOverlayRemoval = false
    private var lifecycleObservers: [NSObjectProtocol] = []

    private var burgundy: UIColor {
        UIColor(
            red: 104.0 / 255.0,
            green: 17.0 / 255.0,
            blue: 38.0 / 255.0,
            alpha: 1.0
        )
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = burgundy
        webView?.isOpaque = false
        webView?.backgroundColor = burgundy
        webView?.scrollView.backgroundColor = burgundy
        // Never expose the web UI before the branded native launch layer is
        // on screen. The web view keeps loading underneath and is revealed
        // only while the splash fades away.
        webView?.alpha = 0

        installLaunchOverlay()

        let center = NotificationCenter.default
        lifecycleObservers.append(center.addObserver(
            forName: UIApplication.willResignActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self else { return }
            self.webView?.alpha = 0
            self.installLaunchOverlay()
        })
        lifecycleObservers.append(center.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            guard let self, self.didScheduleLaunchOverlayRemoval else { return }
            self.removeLaunchOverlay(after: 0.15)
        })
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)

        guard !didScheduleLaunchOverlayRemoval else { return }
        didScheduleLaunchOverlayRemoval = true

        // Keep the branded launch moment visible long enough to survive the
        // Simulator/device transition from SpringBoard without flashing the
        // web view underneath. This applies only to a cold iOS launch.
        removeLaunchOverlay(after: 3.2)
    }

    deinit {
        lifecycleObservers.forEach { observer in
            NotificationCenter.default.removeObserver(observer)
        }
    }

    private func installLaunchOverlay() {
        if let launchOverlay {
            view.bringSubviewToFront(launchOverlay)
            launchOverlay.alpha = 1
            return
        }

        let overlay = UIImageView(frame: view.bounds)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.backgroundColor = burgundy
        overlay.contentMode = .scaleAspectFill
        overlay.image = UIImage(named: "Splash")
        overlay.isUserInteractionEnabled = false
        view.addSubview(overlay)
        launchOverlay = overlay
    }

    private func removeLaunchOverlay(after delay: TimeInterval) {
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak self] in
            guard let self else { return }
            guard let overlay = self.launchOverlay else {
                self.webView?.alpha = 1
                return
            }
            UIView.animate(
                withDuration: 0.4,
                delay: 0,
                options: [.curveEaseOut, .beginFromCurrentState],
                animations: {
                    overlay.alpha = 0
                    self.webView?.alpha = 1
                },
                completion: { _ in
                    overlay.removeFromSuperview()
                    self.launchOverlay = nil
                }
            )
        }
    }

    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(NativeAppleAuthPlugin())
        bridge?.registerPluginInstance(NativeFcmTokenPlugin())
    }
}

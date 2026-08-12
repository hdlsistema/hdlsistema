import Capacitor

class HdlBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginType(NativeAppleAuthPlugin.self)
    }
}

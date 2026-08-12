package com.haciendadeletras.app;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;

import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean keepSplashVisible = true;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        SplashScreen splashScreen = SplashScreen.installSplashScreen(this);
        splashScreen.setKeepOnScreenCondition(() -> keepSplashVisible);
        super.onCreate(savedInstanceState);
        new Handler(Looper.getMainLooper()).postDelayed(() -> keepSplashVisible = false, 1400);
    }
}

package com.shahedltrbah.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.LinearLayout;

import com.google.android.gms.ads.AdError;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.appopen.AppOpenAd;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.gms.ads.rewarded.RewardItem;
import com.google.android.gms.ads.rewarded.RewardedAd;
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback;

public class MainActivity extends Activity {

    private static final String REWARDED_AD_UNIT =
            "ca-app-pub-6105372541214318/6324335345";

    private static final String INTERSTITIAL_AD_UNIT =
            "ca-app-pub-6105372541214318/8852144964";

    private static final String BANNER_AD_UNIT =
            "ca-app-pub-6105372541214318/9590511560";

    private static final String APP_OPEN_AD_UNIT =
            "ca-app-pub-6105372541214318/5946780024";

    private WebView webView;
    private RewardedAd rewardedAd;
    private InterstitialAd interstitialAd;
    private AppOpenAd appOpenAd;

    private boolean appOpenShowing = false;
    private boolean firstResumeHandled = false;
    private long lastInterstitialShown = 0L;
    private int pageSwitchCount = 0;
    private int pendingReward = 0;
    private String pendingCallback = "";

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        MobileAds.initialize(this, status -> {
            loadRewarded();
            loadInterstitial();
            loadAppOpen();
        });

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);

        webView = new WebView(this);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);

        webView.setWebViewClient(new WebViewClient());
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new AdBridge(), "AndroidAdMob");

        AdView banner = new AdView(this);
        banner.setAdSize(AdSize.BANNER);
        banner.setAdUnitId(BANNER_AD_UNIT);

        banner.setAdListener(new AdListener() {
            @Override
            public void onAdFailedToLoad(LoadAdError error) {
                // Keep the app usable if banner is unavailable.
            }
        });

        root.addView(
                webView,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,
                        1f
                )
        );

        root.addView(
                banner,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                )
        );

        setContentView(root);

        webView.loadUrl("file:///android_asset/www/index.html");

        banner.loadAd(new AdRequest.Builder().build());
    }

    @Override
    protected void onResume() {
        super.onResume();

        if (!firstResumeHandled) {
            firstResumeHandled = true;

            webView.postDelayed(
                    this::showAppOpenIfReady,
                    900
            );
        }
    }

    private void loadRewarded() {

        RewardedAd.load(
                this,
                REWARDED_AD_UNIT,
                new AdRequest.Builder().build(),

                new RewardedAdLoadCallback() {

                    @Override
                    public void onAdLoaded(RewardedAd ad) {

                        rewardedAd = ad;

                        ad.setFullScreenContentCallback(
                                new FullScreenContentCallback() {

                                    @Override
                                    public void onAdDismissedFullScreenContent() {
                                        rewardedAd = null;
                                        loadRewarded();
                                    }

                                    @Override
                                    public void onAdFailedToShowFullScreenContent(
                                            AdError error) {

                                        rewardedAd = null;
                                        notifyRewardedFailed();
                                        loadRewarded();
                                    }
                                }
                        );
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {

                        rewardedAd = null;

                        String msg =
                                "AdMob Rewarded ERROR\n"
                                + "Code: " + error.getCode()
                                + "\nDomain: " + error.getDomain()
                                + "\nMessage: " + error.getMessage();

                        android.util.Log.e(
                                "ADMOB_REWARDED",
                                msg
                        );

                        runOnUiThread(() -> {

                            new android.app.AlertDialog.Builder(
                                    MainActivity.this
                            )
                                    .setTitle("AdMob Error")
                                    .setMessage(msg)
                                    .setPositiveButton("OK", null)
                                    .show();
                        });
                    }
                }
        );
    }

    private void showRewarded(int requestedReward) {

        if (rewardedAd == null) {
            notifyRewardedFailed();
            loadRewarded();
            return;
        }

        RewardedAd ad = rewardedAd;
        rewardedAd = null;

        pendingReward = Math.max(
                1,
                requestedReward
        );

        ad.show(
                this,
                (RewardItem item) -> {

                    int earned =
                            item.getAmount() > 0
                                    ? item.getAmount()
                                    : pendingReward;

                    pendingReward = 0;

                    runOnUiThread(() -> {

                        webView.evaluateJavascript(
                                "window.onNativeRewardedAd("
                                        + earned
                                        + ")",
                                null
                        );
                    });
                }
        );
    }

    private void notifyRewardedFailed() {

        pendingReward = 0;
        pendingCallback = "";

        runOnUiThread(() ->
                webView.evaluateJavascript(
                        "window.onNativeRewardedAdFailed()",
                        null
                )
        );
    }

    private void loadInterstitial() {

        InterstitialAd.load(
                this,
                INTERSTITIAL_AD_UNIT,
                new AdRequest.Builder().build(),

                new InterstitialAdLoadCallback() {

                    @Override
                    public void onAdLoaded(InterstitialAd ad) {

                        interstitialAd = ad;

                        ad.setFullScreenContentCallback(
                                new FullScreenContentCallback() {

                                    @Override
                                    public void onAdDismissedFullScreenContent() {
                                        interstitialAd = null;
                                        loadInterstitial();
                                    }

                                    @Override
                                    public void onAdFailedToShowFullScreenContent(
                                            AdError error) {

                                        interstitialAd = null;
                                        loadInterstitial();
                                    }
                                }
                        );
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {
                        interstitialAd = null;
                    }
                }
        );
    }

    private void maybeShowInterstitial() {

        pageSwitchCount++;

        long now = System.currentTimeMillis();

        if (pageSwitchCount < 2 ||
                now - lastInterstitialShown < 60_000L) {
            return;
        }

        if (interstitialAd == null) {
            loadInterstitial();
            return;
        }

        InterstitialAd ad = interstitialAd;
        interstitialAd = null;

        lastInterstitialShown = now;
        pageSwitchCount = 0;

        ad.show(this);
    }

    private void loadAppOpen() {

        if (appOpenAd != null || appOpenShowing) {
            return;
        }

        AppOpenAd.load(
                this,
                APP_OPEN_AD_UNIT,
                new AdRequest.Builder().build(),

                new AppOpenAd.AppOpenAdLoadCallback() {

                    @Override
                    public void onAdLoaded(AppOpenAd ad) {

                        appOpenAd = ad;

                        ad.setFullScreenContentCallback(
                                new FullScreenContentCallback() {

                                    @Override
                                    public void onAdDismissedFullScreenContent() {

                                        appOpenShowing = false;
                                        appOpenAd = null;

                                        loadAppOpen();
                                    }

                                    @Override
                                    public void onAdFailedToShowFullScreenContent(
                                            AdError error) {

                                        appOpenShowing = false;
                                        appOpenAd = null;

                                        loadAppOpen();
                                    }
                                }
                        );
                    }

                    @Override
                    public void onAdFailedToLoad(LoadAdError error) {

                        appOpenAd = null;
                    }
                }
        );
    }

    private void showAppOpenIfReady() {

        if (isFinishing()
                || isDestroyed()
                || appOpenShowing
                || appOpenAd == null) {

            if (appOpenAd == null) {
                loadAppOpen();
            }

            return;
        }

        appOpenShowing = true;
        appOpenAd.show(this);
    }

    private class AdBridge {

        @JavascriptInterface
        public void showRewardedAd(int reward) {

            runOnUiThread(() ->
                    showRewarded(reward)
            );
        }

        @JavascriptInterface
        public void showInterstitialAd() {

            runOnUiThread(() ->
                    maybeShowInterstitial()
            );
        }
    }
}

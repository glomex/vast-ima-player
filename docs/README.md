# VAST-IMA-Player

**VAST-IMA-Player** is a convenience layer around [Google Interactive Media Ads HTML5 SDK](https://developers.google.com/interactive-media-ads/docs/sdks/html5) (short: IMA) which tries to make using IMA less cumbersome for common monetization usecases.

This library can be used to build a simple outstream player or it can be used to implement more complex monetization scenarios. VAST-IMA-Player can monetize any content media player (with pre-, mid and postrolls), which follows the browser-built-in [HTMLMediaElement API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement).

## Why?

IMA [supports a wide range of IAB standards, like VAST, VMAP and VPAID](https://developers.google.com/interactive-media-ads/docs/sdks/html5/compatibility#video-features-and-sdk-versions) and it can also be used for video monetization in conjunction with non-Google ad servers.

When you want to use IMA you either take an existing video-player with an IMA ad integration or you integrate IMA on your own. In the first case you can run into the issue that you don't need all the features that the full fledged video-player provides or that you want to adjust the IMA integration of the video-player, but it is not possible to do so. Integrating IMA on your own can be quite painful and laborious, especially when you want to synchronize the various [Lifecycle states](https://developers.google.com/interactive-media-ads/docs/sdks/html5/architecture#lifecycle).

## Result

Because of the above reasons this library only focuses on managing the video-monetization lifecycle and aligning/merging events without hiding too many details of the underlying IMA library:

* Only relies on HTMLMediaElement and can be used in combination with e.g. [HLS.js](https://github.com/video-dev/hls.js/) or [Shaka Player](https://github.com/google/shaka-player).
* Does not provide any additional video-player UI. The consumer should be able to decide whether to use the native controls or to design his own.
* Provides additional events to manage the video-monetization lifecycle: `MediaStart`, `MediaImpression` and `MediaStop`.
* Proxies media element events (`timeupdate`, `play`, `pause`, ...) and properties (`currentTime`, `volume`, ...) through the VAST-IMA-Player API so that the consumer does not have to implement ad & content switching in his/her code. On iPhone the IMA defaults to use a single video tag to play back ad and content and VAST-IMA-Player ensures that the consumer receives the appropriate ad or content data.
* Prefixes all IMA events with `Ad` so that they are more aligned with the [VPAID 2.0 standard](https://www.iab.com/wp-content/uploads/2015/06/VPAID_2_0_Final_04-10-2012.pdf).
* It auto-resizes the IMA ad container (but also allows manual control).

## Quick Start

~~~html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0">
    <!-- loading IMA on your own -->
    <script src="https://imasdk.googleapis.com/js/sdkloader/ima3.js"></script>
    <!-- and the vast-ima-player -->
    <script src="https://unpkg.com/@glomex/vast-ima-player@1/dist/vast-ima-player.umd.js"></script>
    <title>My VAST-IMA-Player</title>
  </head>
  <body>
    <div id="videoContainer" style="max-width:600px; position:relative;">
      <video style="width:100%; height:100%;" id="mediaElement" controls playsinline poster="https://peach.blender.org/wp-content/uploads/bbb-splash.png" preload="none">
        <source type="video/mp4" src="http://distribution.bbb3d.renderfarming.net/video/mp4/bbb_sunflower_1080p_60fps_normal.mp4">
      </video>
      <!-- the ad-container needs to be placed above the video container -->
      <div id="adContainer" style="position:absolute; left:0; top:0;"></div>
    </div>
    <button id="playAd">Play Ad</button>
    <script>
      var adsRenderingSettings = new google.ima.AdsRenderingSettings();
      var playerOptions = new vastImaPlayer.PlayerOptions();
      var imaPlayer = new vastImaPlayer.Player(
        google.ima,
        document.getElementById('mediaElement'),
        document.getElementById('adContainer'),
        adsRenderingSettings,
        playerOptions
      );
      document.getElementById('playAd').addEventListener('click', function() {
        var playAdsRequest = new google.ima.AdsRequest();
        playAdsRequest.adTagUrl = 'https://glomex.github.io/vast-ima-player/linear-ad.xml';
        imaPlayer.playAds(playAdsRequest);
      });
    </script>
  </body>
</html>
~~~

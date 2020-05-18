import type { ImaSdk } from '@alugha/ima';
import CustomEvent from '@ungap/custom-event';
import { CustomPlayhead } from './custom-playhead';
import { DelegatedEventTarget } from './delegated-event-target';

const IGNORE_UNTIL_CURRENT_TIME = 0.1;
const MEDIA_ELEMENT_EVENTS = [
  'abort', 'canplay', 'canplaythrough',
  'durationchange', 'emptied', 'ended',
  'error', 'loadeddata', 'loadedmetadata',
  'loadstart', 'pause', 'play', 'playing',
  'progress', 'ratechange', 'seeked',
  'seeking', 'stalled', 'suspend', 'timeupdate',
  'volumechange', 'waiting'
];

/**
 * Additional media events that help managing the
 * lifecycle of a media file playback.
 */
enum AdditionalMediaEvent {
  /** Fired when initial media file play happened. */
  MEDIA_START = 'MediaStart',
  /** Fired when the first frame of the media file is played after linear preroll. */
  MEDIA_IMPRESSION = 'MediaImpression',
  /** Fired when the media file playback finished after potential postroll. */
  MEDIA_STOP = 'MediaStop'
}

/**
 * Adjusted enum of https://developers.google.com/interactive-media-ads/docs/sdks/html5/v3/reference/js/google.ima.AdEvent
 * to follow VPAID spec event names.
 */
enum ImaOverridenAdEventTypes {
  /** Fired when an ad error occurred (standalone ad or ad within an ad rule). */
  AD_ERROR = 'AdError',
  /** Fired when an ad rule or a VMAP ad break would have played if autoPlayAdBreaks is false. */
  AD_BREAK_READY = 'AdBreakReady',
  /** Fired when the ad has stalled playback to buffer. */
  AD_BUFFERING = 'AdBuffering',
  AD_CAN_PLAY = 'AdCanPlay',
  /** Fired when an ads list is loaded. */
  AD_METADATA = 'AdMetadata',
  /** Fired when the ad's current time value changes. */
  AD_PROGRESS = 'AdProgress',
  /** Fired when the ads manager is done playing all the ads. */
  ALL_ADS_COMPLETED = 'AdAllAdsCompleted',
  /** Fired when the ad is clicked. */
  CLICK = 'AdClick',
  /** Fired when the ad completes playing. */
  COMPLETE = 'AdComplete',
  /** Fired when content should be paused. This usually happens right before an ad is about to cover the content. */
  CONTENT_PAUSE_REQUESTED = 'AdContentPauseRequested',
  /** Fired when content should be resumed. This usually happens when an ad finishes or collapses. */
  CONTENT_RESUME_REQUESTED = 'AdContentResumeRequested',
  /** Fired when the ad's duration changes. */
  DURATION_CHANGE = 'AdDurationChange',
  EXPANDED_CHANGED = 'AdExpandedChanged',
  /** Fired when the ad playhead crosses first quartile. */
  FIRST_QUARTILE = 'AdFirstQuartile',
  /** Fired when the impression URL has been pinged. */
  IMPRESSION = 'AdImpression',
  /** Fired when an ad triggers the interaction callback. Ad interactions contain an interaction ID string in the ad data. */
  INTERACTION = 'AdInteraction',
  /** Fired when the displayed ad changes from linear to nonlinear, or vice versa. */
  LINEAR_CHANGED = 'AdLinearChanged',
  /** Fired when ad data is available. */
  LOADED = 'AdLoaded',
  /** Fired when a non-fatal error is encountered. The user need not take any action since the SDK will continue with the same or next ad playback depending on the error situation. */
  LOG = 'AdLog',
  /** Fired when the ad playhead crosses midpoint. */
  MIDPOINT = 'AdMidpoint',
  /** Fired when the ad is paused. */
  PAUSED = 'AdPaused',
  /** Fired when the ad is resumed. */
  RESUMED = 'AdResumed',
  /** Fired when the displayed ads skippable state is changed. */
  SKIPPABLE_STATE_CHANGED = 'AdSkippableStateChanged',
  /** Fired when the ad is skipped by the user. */
  SKIPPED = 'AdSkipped',
  /** Fired when the ad starts playing. */
  STARTED = 'AdStarted',
  /** Fired when the ad playhead crosses third quartile. */
  THIRD_QUARTILE = 'AdThirdQuartile',
  /** Fired when the ad is closed by the user. */
  USER_CLOSE = 'AdUserClose',
  VIEWABLE_IMPRESSION = 'AdViewableImpression',
  /** Fired when the ad volume has changed. */
  VOLUME_CHANGED = 'AdVolumeChanged',
  /** Fired when the ad volume has been muted. */
  VOLUME_MUTED = 'AdMuted'
}

type PlayerEvent = AdditionalMediaEvent | ImaOverridenAdEventTypes;

/**
 * Available events of the ad-ima-player.
 *
 * It also triggers the normal media element events (timeupdate, play, pause, ...)
 * when the content playback happens. This is useful when "disableCustomPlaybackForIOS10Plus"
 * is configured and the same media element is used on iOS to render both ad and content.
 * Those event names are not enumerated here because they are known.
 */
export const PlayerEvent = {
  ...ImaOverridenAdEventTypes,
  ...AdditionalMediaEvent,
};

export class PlayerError extends Error {
  errorCode: number;
  innerError: Error;
  type: string;
  vastErrorCode: number;

  constructor(...args) {
    super(...args);
  }
}

export class PlayerOptions {
  /** Sets whether to disable custom playback on iOS 10+ browsers. If true, ads will play inline if the content video is inline. This enables TrueView skippable ads. However, the ad will stay inline and not support iOS's native fullscreen. */
  disableCustomPlaybackForIOS10Plus: boolean = false;
  /** Enables or disables auto resizing of adsManager. If enabled it also resizes non-linear ads. */
  autoResize: boolean = true;
  /** Allows to have a separate 'Learn More' click tracking element on mobile. */
  clickTrackingElement?: HTMLElement
}

export class Player extends DelegatedEventTarget {
  #mediaElement: HTMLVideoElement;
  #adElement: HTMLElement;
  #adElementChild: HTMLElement;
  #customPlayhead: CustomPlayhead;
  #adsRenderingSettings: google.ima.AdsRenderingSettings;
  #ima: ImaSdk;
  #adDisplayContainer: google.ima.AdDisplayContainer;
  #adsManager: google.ima.AdsManager;
  #width: number;
  #height: number;
  #adsLoader: google.ima.AdsLoader;
  #playerOptions: PlayerOptions;
  #resizeObserver: any;
  #currentAd: google.ima.Ad;
  #mediaStartTriggered: boolean = false;
  #mediaImpressionTriggered: boolean = false;
  #cuePoints: Array<number> = [];
  #adCurrentTime: number;
  #adDuration: number;

  constructor(
    ima: ImaSdk,
    mediaElement: HTMLVideoElement,
    adElement: HTMLElement,
    adsRenderingSettings: google.ima.AdsRenderingSettings =
      new ima.AdsRenderingSettings(),
    options: PlayerOptions = new PlayerOptions()
  ) {
    super();
    this.#mediaElement = mediaElement;
    this.#adElement = adElement;
    this.#ima = ima;
    this.#playerOptions = options;
    this.#adsRenderingSettings = adsRenderingSettings;
    // for iOS to reset to initial content state
    this.#adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;

    const disableCustomPlaybackForIOS10Plus = Boolean(
      options.disableCustomPlaybackForIOS10Plus
      && this.#mediaElement.hasAttribute('playsinline')
    );

    this.#adDisplayContainer = new ima.AdDisplayContainer(
      adElement,
      // used as single element for linear ad playback on iOS
      disableCustomPlaybackForIOS10Plus ? undefined : mediaElement,
      // allows to override the 'Learn More' button on mobile
      options.clickTrackingElement
    );
    this.#adElementChild = <HTMLElement>adElement.firstChild;
    this.#adElementChild.style.pointerEvents = 'none';
    this.#adsLoader = new ima.AdsLoader(this.#adDisplayContainer);
    this.#ima.settings.setDisableCustomPlaybackForIOS10Plus(
      disableCustomPlaybackForIOS10Plus
    );
    // the case if a an adbreak should not be played can be controlled
    // via given VMAP instead
    this.#ima.settings.setAutoPlayAdBreaks(true);

    // later used for to determine playhead for triggering midrolls
    // and to determine whether the player is currently playing content
    this.#customPlayhead = new CustomPlayhead(this.#mediaElement);
    this._handleMediaElementEvents = this._handleMediaElementEvents.bind(this);
    MEDIA_ELEMENT_EVENTS.forEach((eventName) => {
      this.#mediaElement.addEventListener(
        eventName, this._handleMediaElementEvents
      );
    });

    this.#adsLoader.addEventListener(
      this.#ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
      (event) => this._onAdsManagerLoaded(event),
      false
    );
    this.#adsLoader.addEventListener(
      this.#ima.AdErrorEvent.Type.AD_ERROR,
      (event) => this._onAdError(event),
      false
    );

    // initial synchronization of width / height
    const { offsetHeight, offsetWidth } = this.#mediaElement;
    this.#width = offsetWidth;
    this.#height = offsetHeight;

    if (options.autoResize) {
      // @ts-ignore
      if (window.ResizeObserver) {
        // @ts-ignore
        this.#resizeObserver = new window.ResizeObserver(
          (entries) => this._resizeObserverCallback(entries)
        );
        this.#resizeObserver.observe(this.#mediaElement);
      }
    }
  }

  activate() {
    // activate assigned mediaElement for future 'play' calls
    if (!this.#mediaElement.dataset.activated) {
      // ignore play result
      try {
        this.#mediaElement.play().catch(() => {});
      } catch(e) {
        // ignore
      }
      this.#mediaElement.pause();
      this.#mediaElement.dataset.activated = '1';
    }
    this.#adDisplayContainer.initialize();
  }

  playAds(adsRequest: google.ima.AdsRequest) {
    const { muted } = this.#mediaElement;
    this.reset();
    this.activate();

    adsRequest.setAdWillPlayMuted(muted);
    adsRequest.linearAdSlotWidth = this.#width;
    adsRequest.linearAdSlotHeight = this.#height;
    adsRequest.nonLinearAdSlotWidth = this.#width;
    adsRequest.nonLinearAdSlotHeight = this.#height;

    this.#adsLoader.requestAds(adsRequest);
  }

  play() {
    if (this.#currentAd && this.#currentAd.isLinear()) {
      this.#adsManager.resume();
    } else {
      this.#mediaElement.play();
    }
  }

  pause() {
    if (this.#currentAd && this.#currentAd.isLinear()) {
      this.#adsManager.pause();
    } else {
      this.#mediaElement.pause();
    }
  }

  set volume(volume: number) {
    if (this.#currentAd && this.#currentAd.isLinear()) {
      this.#adsManager.setVolume(volume);
    } else {
      this.#mediaElement.volume = volume;
    }
  }

  get volume() {
    if (this.#currentAd && this.#currentAd.isLinear()) {
      return this.#adsManager.getVolume();
    }
    return this.#mediaElement.volume;
  }

  set muted(muted: boolean) {
    if (this.#currentAd && this.#currentAd.isLinear()) {
      // ignoring the fact that there is a separate
      // muted flag on the media element
      this.#adsManager.setVolume(muted ? 0 : 1);
    } else {
      this.#mediaElement.muted = muted;
    }
  }

  get currentTime() {
    if (this.#adCurrentTime) {
      return this.#adCurrentTime;
    }
    return this.#mediaElement.currentTime;
  }

  get duration() {
    if (this.#adDuration) {
      return this.#adDuration;
    }
    return this.#mediaElement.duration;
  }

  resize(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    if (this.#adsManager) {
      this.#adsManager.resize(width, height, this._getViewMode());
    }
  }

  get muted() {
    if (this.#currentAd && this.#currentAd.isLinear()) {
      return this.#adsManager.getVolume() === 0;
    }
    return this.#mediaElement.muted;
  }

  get cuePoints() {
    return this.#cuePoints;
  }

  reset() {
    this._resetAd();
    this.#cuePoints = [];
    if (this.#adsManager) {
      // see https://developers.google.com/interactive-media-ads/docs/sdks/html5/faq#8
      this.#adsManager.destroy();
      this.#adsLoader.contentComplete();
      this.#adsManager = undefined;
    }
  }

  destroy() {
    this.reset();
    if (this.#customPlayhead) {
      this.#customPlayhead.destroy();
    }
    MEDIA_ELEMENT_EVENTS.forEach((eventName) => {
      this.#mediaElement.removeEventListener(
        eventName, this._handleMediaElementEvents
      );
    });
    this.#adDisplayContainer.destroy();
    this.#adsLoader.destroy();
    this.#resizeObserver.disconnect();
    this.#mediaImpressionTriggered = false;
    this.#mediaStartTriggered = false;
  }

  _resetAd() {
    this.#currentAd = undefined;
    this.#adCurrentTime = undefined;
    this.#adDuration = undefined;
    this.#adElementChild.style.pointerEvents = 'none';
    this.#adElement.classList.remove('nonlinear');
    if (this.#adsManager) {
      // just ensure to start from defined width/height
      this._resizeAdsManager();
    }
  }

  private _handleMediaElementEvents(event: Event) {
    if (!this.#customPlayhead.enabled) return;

    if (event.type === 'timeupdate') {
      // ignoring first timeupdate after play
      // because we can be in ad state too early
      if (this.#mediaElement.currentTime < IGNORE_UNTIL_CURRENT_TIME) {
        return;
      }
      if (!this.#mediaImpressionTriggered) {
        this.dispatchEvent(
          new CustomEvent(PlayerEvent.MEDIA_IMPRESSION)
        );
        this.#mediaImpressionTriggered = true;
      }
    }
    if (event.type === 'play'
      && !this.#mediaStartTriggered
    ) {
      this.dispatchEvent(
        new CustomEvent(PlayerEvent.MEDIA_START)
      );
      this.#mediaStartTriggered = true;
    }
    if (event.type === 'ended') {
      this.#adsLoader.contentComplete();
      if (!this.#adsManager) {
        this._mediaStop();
      }
    }
    // @ts-ignore
    if (!window.ResizeObserver
      && this.#playerOptions.autoResize
      && event.type === 'loadedmetadata'
    ) {
      // in case ResizeObserver is not supported we want
      // to use at least the size after the media element got
      // loaded
      const { offsetHeight, offsetWidth } = this.#mediaElement;
      this.#width = offsetWidth;
      this.#height = offsetHeight;
      this._resizeAdsManager();
    }
    this.dispatchEvent(new CustomEvent(event.type));
  }

  private _handleAdsManagerEvents(event: google.ima.AdEvent) {
    const { AdEvent } = this.#ima;

    // @ts-ignore
    switch(event.type) {
      case AdEvent.Type.STARTED:
        const ad = this.#currentAd = event.getAd();
        // when playing an ad-pod IMA uses two video-tags
        // and switches between those but does not set volume
        // on both video-tags. Calling setVolume with the
        // previously stored volume synchronizes volume with
        // the other video-tag
        this.#adsManager.setVolume(this.#adsManager.getVolume());
        this.#adElement.classList.remove('nonlinear');
        this._resizeAdsManager();
        // single or non-linear ads
        if (!ad.isLinear()) {
          this.#adElement.classList.add('nonlinear');
          this._playContent();
        } else {
          this.#customPlayhead.disable();
        }
        this.#adElementChild.style.pointerEvents = 'auto';
        break;
      case AdEvent.Type.ALL_ADS_COMPLETED:
        this.reset();
        this._playContent();
        break;
      case AdEvent.Type.CONTENT_PAUSE_REQUESTED:
        this.#adElementChild.style.pointerEvents = 'auto';
        this.#mediaElement.pause();
        // synchronize volume state because IMA does not do that
        this.#adsManager.setVolume(
          this.#mediaElement.muted ? 0 : this.#mediaElement.volume
        );
        break;
      case AdEvent.Type.CONTENT_RESUME_REQUESTED:
        // synchronize volume state because IMA does not do that
        const adVolume = this.#adsManager.getVolume();
        if (adVolume === 0) {
          this.#mediaElement.muted = true;
        } else {
          this.#mediaElement.muted = false;
          this.#mediaElement.volume = this.#adsManager.getVolume();
        }

        // remove already played cuepoints
        if (this.#currentAd) {
          const cuePointIndex = this.#cuePoints.indexOf(
            this.#currentAd.getAdPodInfo().getTimeOffset()
          );
          if (cuePointIndex > -1) {
            this.#cuePoints.splice(cuePointIndex, 1);
          }
        }

        if (this.#mediaElement.ended) {
          // after postroll
          this.reset();
          this._mediaStop();
        } else {
          this._resetAd();
        }
        this._playContent();
        break;
      case AdEvent.Type.AD_METADATA:
        this.#cuePoints = this.#adsManager.getCuePoints();
        break;
      case AdEvent.Type.LOG:
        // this gets triggered when individual positions of VMAP fail
        const adDataLog = event.getAdData();
        if (adDataLog.adError) {
          const imaError = {
            getError: () => adDataLog.adError,
            getUserRequestContext: () => {}
          };
          this._onAdError(imaError);
        }
      case AdEvent.Type.AD_PROGRESS:
        const adDataProgress = event.getAdData();
        this.#adCurrentTime = adDataProgress.currentTime;
        this.#adDuration = adDataProgress.duration;
    }
  }

  private _onAdsManagerLoaded(loadedEvent: google.ima.AdsManagerLoadedEvent) {
    const { AdEvent, AdErrorEvent: { Type: { AD_ERROR } } } = this.#ima;
    const adsManager = this.#adsManager = loadedEvent.getAdsManager(
      this.#customPlayhead, this.#adsRenderingSettings
    );

    Object.keys(AdEvent.Type).forEach((imaEventName) => {
      adsManager.addEventListener(AdEvent.Type[imaEventName], (event) => {
        this._handleAdsManagerEvents(
          event
        );
        if (PlayerEvent[imaEventName]) {
          this.dispatchEvent(new CustomEvent(PlayerEvent[imaEventName], {
            detail: {
              ad: this.#currentAd || event.getAd()
            }
          }));
        }
      });
    });
    adsManager.addEventListener(AD_ERROR, (event) => this._onAdError(event));

    // start ad playback
    try {
      adsManager.init(this.#width, this.#height, this._getViewMode());
      // ensures to synchronize initial media-player state (e.g. muted state)
      adsManager.start();
    } catch (adError) {
      this._onAdError(adError);
    }
  }

  private _mediaStop() {
    setTimeout(() => {
      this.#mediaImpressionTriggered = false;
      this.#mediaStartTriggered = false;
      this.dispatchEvent(
        new CustomEvent(PlayerEvent.MEDIA_STOP)
      );
    }, 1);
  }

  private _resizeObserverCallback(entries) {
    for (let entry of entries) {
      if (entry.contentBoxSize) {
        this.#width = entry.contentBoxSize.inlineSize;
        this.#height = entry.contentBoxSize.blockSize;
      } else {
        this.#width = entry.contentRect.width;
        this.#height = entry.contentRect.height;
      }
    }
    this._resizeAdsManager();
  }

  private _resizeAdsManager() {
    if (!this.#playerOptions.autoResize || !this.#adsManager) return;

    const ad = this.#currentAd;
    const viewMode = this._getViewMode();
    const isNonLinearAd = ad && !ad.isLinear();

    if (!isNonLinearAd) {
      this.#adsManager.resize(this.#width, this.#height, viewMode);
    } else if (ad) {
      if (ad.getWidth() > this.#width || ad.getHeight() > this.#height) {
        this.#adsManager.resize(this.#width, this.#height, viewMode);
      } else {
        // in case we won't add 8 pixels it triggers a VAST error
        // that there is not enough space to render the nonlinear ad
        this.#adsManager.resize(ad.getWidth(), ad.getHeight() + 8, viewMode);
      }
    }
  }

  private _getViewMode() {
    if (
      document.fullscreenElement // Standard syntax
      // @ts-ignore
      || document.webkitFullscreenElement // Chrome, Safari and Opera synta
      // @ts-ignore
      || document.mozFullScreenElement // Firefox syntax
      // @ts-ignore
      || document.msFullscreenElement // IE/Edge syntax
      // @ts-ignore
      || this.#mediaElement.webkitDisplayingFullscreen // Video in fullscreen, e.g. Safari iOS
    ) {
      return this.#ima.ViewMode.FULLSCREEN;
    }
    return this.#ima.ViewMode.NORMAL;
  }

  private _playContent() {
    this.#adElementChild.style.pointerEvents = 'none';
    if (!this.#mediaElement.ended) {
      this.#customPlayhead.enable();
      this.#mediaElement.play();
    }
  }

  private _onAdError(event: google.ima.AdErrorEvent) {
    const thrownError = event.getError();
    const error = new PlayerError(thrownError.getMessage());
    error.type = thrownError.getType();
    error.errorCode = thrownError.getErrorCode();
    error.vastErrorCode = thrownError.getVastErrorCode();
    error.innerError = thrownError.getInnerError();
    this.dispatchEvent(new CustomEvent(PlayerEvent.AD_ERROR, {
      detail: { error }
    }));
    this._resetAd();
    this._playContent();
  }
}

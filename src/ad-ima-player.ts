import type { ImaSdk } from '@alugha/ima';
import { CustomPlayhead } from './custom-playhead';
import { DelegatedEventTarget } from './delegated-event-target';

const MEDIA_ELEMENT_EVENTS = [
  'abort', 'canplay', 'canplaythrough',
  'durationchange', 'emptied', 'ended',
  'error', 'loadeddata', 'loadedmetadata',
  'loadstart', 'pause', 'play', 'playing',
  'progress', 'ratechange', 'seeked',
  'seeking', 'stalled', 'suspend', 'timeupdate',
  'volumechange', 'waiting'
];

export class AdImaPlayerError extends Error {
  errorCode: number;
  innerError: Error;
  type: string;
  vastErrorCode: number;

  constructor(...args) {
    super(...args);
  }
}

export class AdImaPlayerOptions {
  /** Sets whether to disable custom playback on iOS 10+ browsers. If true, ads will play inline if the content video is inline. This enables TrueView skippable ads. However, the ad will stay inline and not support iOS's native fullscreen. */
  disableCustomPlaybackForIOS10Plus: boolean = false;
  /** Enables or disables auto resizing of adsManager. If enabled it also resizes non-linear ads. */
  autoResize: boolean = true;
  /** Allows to have a separate "Learn More" click tracking element on mobile. */
  clickTrackingElement?: HTMLElement
}

export class AdImaPlayer extends DelegatedEventTarget {
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
  #adImaPlayerOptions: AdImaPlayerOptions;
  #resizeObserver: any;
  #currentAd: google.ima.Ad;
  #mediaStartTriggered: boolean = false;
  #mediaImpressionTriggered: boolean = false;
  #cuePoints: Array<number> = [];

  constructor(
    ima: ImaSdk,
    mediaElement: HTMLVideoElement,
    adElement: HTMLElement,
    adsRenderingSettings: google.ima.AdsRenderingSettings =
      new ima.AdsRenderingSettings(),
    options: AdImaPlayerOptions = new AdImaPlayerOptions()
  ) {
    super();
    this.#mediaElement = mediaElement;
    this.#adElement = adElement;
    this.#ima = ima;
    this.#adsRenderingSettings = adsRenderingSettings;
    this.#adImaPlayerOptions = options;

    const disableCustomPlaybackForIOS10Plus = Boolean(
      options.disableCustomPlaybackForIOS10Plus
      && this.#mediaElement.hasAttribute('playsinline')
    );

    this.#adDisplayContainer = new ima.AdDisplayContainer(
      adElement,
      // used as single element for linear ad playback on iOS
      disableCustomPlaybackForIOS10Plus ? undefined : mediaElement,
      // allows to override the "Learn More" button on mobile
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

    // @ts-ignore
    if (options.autoResize && window.ResizeObserver) {
      // @ts-ignore
      this.#resizeObserver = new window.ResizeObserver(
        (entries) => this._resizeObserverCallback(entries)
      );
      this.#resizeObserver.observe(this.#mediaElement);
    }
  }

  activate() {
    // activate assigned mediaElement for future "play" calls
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
    const { offsetHeight, offsetWidth, muted } = this.#mediaElement;
    // for browsers that don't support ResizeObserver
    this.#width = offsetWidth;
    this.#height = offsetHeight;
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

  resizeAdsManager(width: number, height: number) {
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

  reset() {
    this.#currentAd = undefined;
    this.#adElementChild.style.pointerEvents = 'none';
    this.#adElement.classList.remove('nonlinear');
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

  private _handleMediaElementEvents(event: Event) {
    if (event.target === this.#mediaElement && this.#customPlayhead.enabled) {
      if (event.type === 'timeupdate'
        && !this.#mediaImpressionTriggered
        && this.#customPlayhead.currentTime !== 0
      ) {
        this.dispatchEvent(new CustomEvent('MediaImpression'));
        this.#mediaImpressionTriggered = true;
      }
      if (event.type === 'play'
        && !this.#mediaStartTriggered
      ) {
        this.dispatchEvent(new CustomEvent('MediaStart'));
        this.#mediaStartTriggered = true;
      }
      if (event.type === 'ended') {
        this._mediaElementEnded();
      }
      this.dispatchEvent(new CustomEvent(event.type));
      return;
    }
  }

  private _handleAdsManagerEvents(event: google.ima.AdEvent) {
    const { AdEvent } = this.#ima;
    // @ts-ignore
    const { type, target } = event;

    switch(type) {
      case AdEvent.Type.STARTED:
        const ad = this.#currentAd = event.getAd();
        this.#adElement.classList.remove('nonlinear');
        // single or non-linear ads
        if (!ad.isLinear()) {
          if (this.#adImaPlayerOptions.autoResize) {
            // in case we won't add 8 pixels it triggers a VAST error
            // that there is not enough space to render the ad
            this.#adsManager.resize(
              ad.getWidth(), ad.getHeight() + 8, this._getViewMode()
            );
          }
          this.#adElement.classList.add('nonlinear');
          this._playContent();
        } else {
          if (this.#adImaPlayerOptions.autoResize) {
            this.#adsManager.resize(
              this.#width, this.#height, this._getViewMode()
            );
          }
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
        if (this.#currentAd && this.#currentAd.getAdPodInfo().getPodIndex() === -1) {
          this.#adsManager.destroy();
        }
        this.#currentAd = undefined;
        // synchronize volume state because IMA does not do that
        const adVolume = this.#adsManager.getVolume();
        if (adVolume === 0) {
          this.#mediaElement.muted = true;
        } else {
          this.#mediaElement.muted = false;
          this.#mediaElement.volume = this.#adsManager.getVolume();
        }

        if (this.#mediaElement.ended) {
          // after postroll
          this._mediaStop();
        }
        this._playContent();
        break;
      case AdEvent.Type.AD_METADATA:
        this.#cuePoints = this.#adsManager.getCuePoints();
    }

    if (target === this.#adsManager
      && type.indexOf('content') === -1
    ) {
      const startsWithAd = type.indexOf('ad') === 0;
      const eventName = `${startsWithAd ? '' : 'Ad'}${
        type.charAt(0).toUpperCase() + type.slice(1)
      }`;
      this.dispatchEvent(new CustomEvent(eventName, {
        detail: {
          imaAd: this.#currentAd || event.getAd(),
          adData: event.getAdData(),
          cuePoints: this.#cuePoints
        }
      }));
    }
  }

  private _onAdsManagerLoaded(loadedEvent: google.ima.AdsManagerLoadedEvent) {
    // for iOS to reset to initial content state
    this.#adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
    const { AdEvent, AdErrorEvent: { Type: { AD_ERROR } } } = this.#ima;
    const adsManager = this.#adsManager = loadedEvent.getAdsManager(
      this.#customPlayhead, this.#adsRenderingSettings
    );

    Object.keys(AdEvent.Type).forEach((imaEventName) => {
      adsManager.addEventListener(AdEvent.Type[imaEventName], (event) => this._handleAdsManagerEvents(event));
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

  private _mediaElementEnded() {
    // start potential postroll
    this.#adsLoader.contentComplete();
    if (!this.#adsManager) {
      this._mediaStop();
    }
  }

  private _mediaStop() {
    setTimeout(() => {
      this.#mediaImpressionTriggered = false;
      this.#mediaStartTriggered = false;
      this.dispatchEvent(new CustomEvent('MediaStop'));
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

    const isNonLinearAd = this.#currentAd && !this.#currentAd.isLinear();
    const isNonLinearAdTooBig = isNonLinearAd && (
      this.#currentAd.getWidth() > this.#width
      || this.#currentAd.getHeight() > this.#height
    );

    if (this.#adsManager && (!isNonLinearAd || isNonLinearAdTooBig)) {
      this.#adsManager.resize(this.#width, this.#height, this._getViewMode());
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
    const error = event.getError();
    const thrownError = new AdImaPlayerError(error.getMessage());
    thrownError.type = error.getType();
    thrownError.errorCode = error.getErrorCode();
    thrownError.vastErrorCode = error.getVastErrorCode();
    thrownError.innerError = error.getInnerError();
    this.dispatchEvent(new CustomEvent('AdError', {
      detail: {
        error: thrownError
      }
    }));
    this._playContent();
    this.#adElement.classList.remove('nonlinear');
    if (this.#adImaPlayerOptions.autoResize) {
      this.#adsManager.resize(
        this.#width, this.#height, this._getViewMode()
      );
    }
  }
}

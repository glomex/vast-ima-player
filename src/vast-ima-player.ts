/* tslint:disable:max-classes-per-file */
import type { ImaSdk } from '@alugha/ima';
import CustomEvent from '@ungap/custom-event';
import { CustomPlayhead } from './custom-playhead';
import { DelegatedEventTarget } from './delegated-event-target';

const IGNORE_UNTIL_CURRENT_TIME = 0.5;
const REQUEST_ADS_TIMEOUT = 5000;
const REQUEST_ADS_TIMEOUT_ERROR = 9000;
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
  MEDIA_STOP = 'MediaStop',
  /** Fired when ad break cue points change. */
  MEDIA_CUE_POINTS_CHANGE = 'MediaCuePointsChange'
}

/**
 * Adjusted enum of https://developers.google.com/interactive-media-ads/docs/sdks/html5/v3/reference/js/google.ima.AdEvent
 * to follow VPAID spec event names.
 */
enum ImaToAdEventMap {
  // most relevant Ad events
  /**
   * Fired when an ad error occurred (standalone ad or ad within an ad rule).
   * IMA provides these events on different objects and this event normalizes it.
   */
  AD_ERROR = 'AdError',
  /** Fired when the ad has stalled playback to buffer. */
  AD_BUFFERING = 'AdBuffering',
  /** Fired when ad data is available. */
  LOADED = 'AdLoaded',
  /** Fired when the impression URL has been pinged. */
  IMPRESSION = 'AdImpression',
  /** Fired when the ad starts playing. */
  STARTED = 'AdStarted',
  /** Fired when the ad playhead crosses first quartile. */
  FIRST_QUARTILE = 'AdFirstQuartile',
  /** Fired when the ad playhead crosses midpoint. */
  MIDPOINT = 'AdMidpoint',
  /** Fired when the ad playhead crosses third quartile. */
  THIRD_QUARTILE = 'AdThirdQuartile',
  /** Fired when the ad's current time value changes. */
  AD_PROGRESS = 'AdProgress',
  /** Fired when the ad completes playing. */
  COMPLETE = 'AdComplete',
  /** Fired when the ad is clicked. */
  CLICK = 'AdClick',
  /** Fired when the ad is paused. */
  PAUSED = 'AdPaused',
  /** Fired when the ad is resumed. */
  RESUMED = 'AdResumed',
  /** Fired when the ad is skipped by the user. */
  SKIPPED = 'AdSkipped',
  /** Fired when the displayed ads skippable state is changed. */
  SKIPPABLE_STATE_CHANGED = 'AdSkippableStateChanged',
  /** Fired when the ad volume has changed. */
  VOLUME_CHANGED = 'AdVolumeChanged',
  /** Fired when the ad volume has been muted. */
  VOLUME_MUTED = 'AdMuted',

  // Ad lifecycle events
  /** Fired when an ads list is loaded. This is when ad rule cuePoints are available. */
  AD_METADATA = 'AdMetadata',
  /** Fired when an ad rule or a VMAP ad break would have played if autoPlayAdBreaks is false. */
  AD_BREAK_READY = 'AdBreakReady',
  /** Fired when content should be paused. This usually happens right before an ad is about to cover the content. */
  CONTENT_PAUSE_REQUESTED = 'AdContentPauseRequested',
  /** Fired when content should be resumed. This usually happens when an ad finishes or collapses. */
  CONTENT_RESUME_REQUESTED = 'AdContentResumeRequested',
  /** Fired when the ads manager is done playing all the ads. */
  ALL_ADS_COMPLETED = 'AdAllAdsCompleted',

  // VPAID events
  /** Fired when the ad's duration changes. */
  DURATION_CHANGE = 'AdDurationChange',
  /** Fired when an ad triggers the interaction callback. Ad interactions contain an interaction ID string in the ad data. */
  INTERACTION = 'AdInteraction',
  /** Fired when the displayed ad changes from linear to nonlinear, or vice versa. */
  LINEAR_CHANGED = 'AdLinearChanged',
  /** Fired when a non-fatal error is encountered. The user need not take any action since the SDK will continue with the same or next ad playback depending on the error situation. */
  LOG = 'AdLog',
  /** Fired when the ad is closed by the user. */
  USER_CLOSE = 'AdUserClose',

  // Undocumented events
  /** Not document by IMA */
  AD_CAN_PLAY = 'AdCanPlay',
  /** Not document by IMA */
  EXPANDED_CHANGED = 'AdExpandedChanged',
  /** Not document by IMA */
  VIEWABLE_IMPRESSION = 'AdViewableImpression'
}

type PlayerEvent = AdditionalMediaEvent | ImaToAdEventMap;

/**
 * Available events of the VAST-IMA-Player.
 *
 * Also see https://developers.google.com/interactive-media-ads/docs/sdks/html5/v3/reference/js/google.ima.AdEvent
 *
 * The player also triggers the normal media element events
 * (https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Media_events)
 * when the content playback happens. This is useful when
 * "disableCustomPlaybackForIOS10Plus = false" (default) is configured and
 * the same media element is used on iOS to render both ad and content.
 * Those event names are not enumerated here because they are known.
 */
export const PlayerEvent = {
  ...ImaToAdEventMap,
  ...AdditionalMediaEvent,
};

export class PlayerOptions {
  /** Sets whether to disable custom playback on iOS 10+ browsers. If true, ads will play inline if the content video is inline. This enables TrueView skippable ads. However, the ad will stay inline and not support iOS's native fullscreen. */
  disableCustomPlaybackForIOS10Plus: boolean = false;
  /** Enables or disables auto resizing of adsManager. If enabled it also resizes non-linear ads. */
  autoResize: boolean = true;
  /** Allows to have a separate 'Learn More' click tracking element on mobile. */
  clickTrackingElement?: HTMLElement
}

export class PlayerError extends Error {
  errorCode: number;
  innerError: Error;
  type: string;
  vastErrorCode: number;

  constructor(...args) {
    super(...args);
  }
}

type StartAd = {
  start: () => void,
  startWithoutReset: () => void,
  ad?: google.ima.Ad,
  adBreakTime?: number
};

type StartAdCallback = (startAd: StartAd) => void;

/**
 * Convenience player wrapper for the Google IMA HTML5 SDK
 */
export class Player extends DelegatedEventTarget {
  #mediaElement: HTMLVideoElement;
  #adElement: HTMLElement;
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
  #customPlaybackTimeAdjustedOnEnded: boolean = false;
  #cuePoints: number[] = [];
  #adCurrentTime: number;
  #adDuration: number;
  #startAdCallback: StartAdCallback;
  #requestAdsTimeout: number;

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

    if (options.disableCustomPlaybackForIOS10Plus
      && !this.#mediaElement.hasAttribute('playsinline')
    ) {
      // assign "playsinline" when on iOS two video elements
      // will be used for content and ad playback
      this.#mediaElement.setAttribute('playsinline', '');
    }
    this.#ima.settings.setDisableCustomPlaybackForIOS10Plus(
      options.disableCustomPlaybackForIOS10Plus
    );

    this.#adDisplayContainer = new ima.AdDisplayContainer(
      adElement,
      // used as single element for linear ad playback on iOS
      options.disableCustomPlaybackForIOS10Plus ? undefined : mediaElement,
      // allows to override the 'Learn More' button on mobile
      options.clickTrackingElement
    );
    this.#adElement.style.display = 'none';
    this.#adsLoader = new ima.AdsLoader(this.#adDisplayContainer);

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
      (event) => {
        this._onAdError(this._createPlayerErrorFromImaErrorEvent(event))
      },
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

  /**
   * This allows synchronous activation of the media element
   * and the Google IMA ad-display-container. Useful when you
   * have to do async work before calling "playAds".
   */
  activate() {
    if (this.#mediaElement.paused) {
      // ignore play result
      try {
        // always calling play to trigger a fresh MediaStart
        this.#mediaElement.play().catch(() => undefined);
      } catch(e) {
        // ignore
      }
    }
    this.#mediaElement.pause();
    this.#adDisplayContainer.initialize();
  }

  /**
   * This is the entry point to start ad playback. It can be used
   * as such:
   *
   * - With a single VAST at the beginning to play a preroll
   * - Anyhwere during content playback with a single VAST
   * - With a single VMAP at the beginning
   */
  playAds(adsRequest: google.ima.AdsRequest) {
    this.#ima.settings.setAutoPlayAdBreaks(true);
    this._requestAds(adsRequest);
    this.activate();
  }

  /**
   * Similar to "playAds" method but with the difference
   * that it allows to first load the ad and start it separately
   * within the given callback.
   *
   * When a VAST or a VMAP ad break is given the callback is called
   * with a "start" method which either starts playing the individual
   * VAST ad or starts the VMAP ad break. If "start" method is not called
   * it won't play the ad.
   */
  loadAds(
    adsRequest: google.ima.AdsRequest,
    startAdCallback: StartAdCallback
  ) {
    this.#ima.settings.setAutoPlayAdBreaks(false);
    this._requestAds(adsRequest, startAdCallback);
  }

  private _requestAds(
    adsRequest: google.ima.AdsRequest,
    startAdCallback?: StartAdCallback
  ) {
    // in case of replay we go back to start
    if (this.#mediaElement.ended) {
      this.#customPlayhead.reset();
      this.#mediaElement.currentTime = 0;
    }
    this.reset().then(() => {
      this.#startAdCallback = startAdCallback;
      adsRequest.linearAdSlotWidth = this.#width;
      adsRequest.linearAdSlotHeight = this.#height;
      adsRequest.nonLinearAdSlotWidth = this.#width;
      adsRequest.nonLinearAdSlotHeight = this.#height;

      // trigger an error after 5s in case adsManagerLoaded
      // does not come up, so that content playback starts
      this.#requestAdsTimeout = window.setTimeout(() => {
        const error = new PlayerError(`No adsManagerLoadedEvent within ${REQUEST_ADS_TIMEOUT}ms.`);
        error.errorCode = REQUEST_ADS_TIMEOUT_ERROR;
        this._onAdError(error);
      }, REQUEST_ADS_TIMEOUT);
      this.#adsLoader.requestAds(adsRequest);
    });
  }

  skipAd() {
    if (this.#adsManager) {
      this.#adsManager.skip();
    }
  }

  /**
   * Starts playback of either content or ad element.
   */
  play() {
    if (!this.#customPlayhead.enabled && this.#adsManager) {
      this.#adsManager.resume();
    } else {
      this.#mediaElement.play();
    }
  }

  /**
   * Pauses playback of either content or ad element.
   */
  pause() {
    if (!this.#customPlayhead.enabled && this.#adsManager) {
      this.#adsManager.pause();
    } else {
      this.#mediaElement.pause();
    }
  }

  /**
   * Sets volume of either content or ad element.
   */
  set volume(volume: number) {
    if (!this.#customPlayhead.enabled && this.#adsManager) {
      this.#adsManager.setVolume(volume);
    } else {
      this.#mediaElement.volume = volume;
    }
  }

  /**
   * Returns volume of either content or ad element.
   */
  get volume() {
    if (!this.#customPlayhead.enabled && this.#adsManager) {
      return this.#adsManager.getVolume();
    }
    return this.#mediaElement.volume;
  }

  /**
   * Sets muted state on either content or ad element.
   */
  set muted(muted: boolean) {
    if (!this.#customPlayhead.enabled && this.#adsManager) {
      // ignoring the fact that there is a separate
      // muted flag on the media element
      this.#adsManager.setVolume(muted ? 0 : 1);
    } else {
      this.#mediaElement.muted = muted;
    }
  }

  /**
   * Returns muted state of either content or ad element.
   */
  get muted() {
    if (!this.#customPlayhead.enabled && this.#adsManager) {
      return this.#adsManager.getVolume() === 0;
    }
    return this.#mediaElement.muted;
  }

  /**
   * Sets current time of content element when not in ad playback mode.
   */
  set currentTime(currentTime: number) {
    if (this.#customPlayhead.enabled) {
      this.#mediaElement.currentTime = currentTime;
    }
  }

  /**
   * Returns current playhead time of either content or ad element.
   */
  get currentTime() {
    if (this.#adCurrentTime !== undefined) {
      return this.#adCurrentTime;
    }
    return this.#mediaElement.currentTime;
  }

  /**
   * Returns current duration of either content or ad element.
   */
  get duration() {
    if (this.#adDuration !== undefined) {
      return this.#adDuration;
    }
    return this.#mediaElement.duration;
  }

  /**
   * Returns list of ad break cue points that weren't played yet.
   * Only available after "AdMetadata" event when VMAP is passed in playAds.
   */
  get cuePoints() {
    return [...this.#cuePoints];
  }

  private _setCuePoints(cuePoints: number[]) {
    this.#cuePoints = [...cuePoints];
    this.dispatchEvent(new CustomEvent(PlayerEvent.MEDIA_CUE_POINTS_CHANGE, {
      detail: { cuePoints: [...this.#cuePoints] }
    }));
  }

  /**
   * Remove already played cuepoints
   *
   * @param timeOffset offset in seconds as defined in VMAP or 0 for preroll and -1 for postroll
   */
  private _adjustCuePoints(timeOffset) {
    const cuePointIndex = this.cuePoints.indexOf(
      timeOffset
    );
    if (cuePointIndex > -1) {
      this.#cuePoints.splice(cuePointIndex, 1);
      this._setCuePoints(this.#cuePoints);
    }
  }

  /**
   * Allows resizing the ad element. Useful when options.autoResize = false.
   */
  resizeAd(width: number, height: number) {
    this.#width = width;
    this.#height = height;
    if (this.#adsManager) {
      this.#adsManager.resize(width, height, this._getViewMode());
    }
    this.#adElement.style.width = `${width}px`;
    this.#adElement.style.height = `${height}px`;
  }

  /**
   * Cleans up current ad and ad manager session.
   */
  reset() {
    const isSpecialReset = this._isCustomPlaybackUsed()
      && this.#adsManager
      && this.#currentAd
      && this.#currentAd.isLinear();
    const destroyAdsManager = () => {
      if (this.#adsManager) {
        this.#adsManager.destroy();
        this.#adsLoader.contentComplete();
        this.#adsManager = undefined;
      }
    };
    this._resetAd();
    this.#cuePoints = [];
    this.#startAdCallback = undefined;
    if (isSpecialReset) {
      return new Promise((resolve) => {
        // On iOS with single video tag we first need to
        // finish "adsManager.stop" during ad-playback to get back
        // to the content before calling "adsManager.destroy".
        // Otherwise it would use the current displayed ad as content.
        // We also wait until canplay + 50ms to ensure that IMA
        // is done resetting
        const onCanPlay = () => {
          this.#mediaElement.removeEventListener('canplay', onCanPlay);
          destroyAdsManager();
          setTimeout(() => resolve(), 50);
        }
        this.#adsManager.stop();
        this.#adsManager.discardAdBreak();
        this.#mediaElement.addEventListener('canplay', onCanPlay);
      });
    }
    destroyAdsManager();
    return Promise.resolve();
  }

  /**
   * Completely destroys this instance. It is unusable after that.
   */
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
    this.#mediaImpressionTriggered = false;
    this.#customPlaybackTimeAdjustedOnEnded = false;
    this.#mediaStartTriggered = false;
    if (this.#resizeObserver) {
      this.#resizeObserver.disconnect();
    }
  }

  private _resetAd() {
    this.#currentAd = undefined;
    this.#adCurrentTime = undefined;
    this.#adDuration = undefined;
    this.#adElement.style.display = 'none';
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
      if (this.#adsManager) {
        const cuePointsAfterJump = this.#adsManager.getCuePoints().filter((cuePoint) => {
          return (cuePoint >= 0 && cuePoint < this.#customPlayhead.currentTime);
        });
        const cuePointToRemove = cuePointsAfterJump.pop();
        // in case the ad-break lead to an error it cannot be detected which
        // ad break was affected because IMA could've preloaded an ad-break
        // without emitting an event for it
        this._adjustCuePoints(cuePointToRemove);
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
      if (this._isCustomPlaybackUsed()
        && this.#mediaElement.currentTime === this.#mediaElement.duration
        && this.#cuePoints.indexOf(-1) > -1
      ) {
        /* Fixing a bug with postroll on iOS
         * when a postroll gets started via "contentComplete"
         * and a single video-tag is used IMA does not reset
         * back to the content after the postroll finished.
         * Setting the time of the video tag a little shorter
         * than the duration, so that the video-tag is not set to "ended".
         */
        this.#mediaElement.currentTime = this.#mediaElement.duration - 0.00001;
        this.#customPlaybackTimeAdjustedOnEnded = true;
      }
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
      case AdEvent.Type.LOADED:
        // For an individual VAST ad inform on "LOADED" to
        // to allow starting the ad manually.
        // In case of VMAP it could preload ads before the
        // actual ad break. For VMAP it allows starting the ad
        // on "AD_BREAK_READY" instead.
        if (this.#startAdCallback && this.#cuePoints.length === 0) {
          this.#startAdCallback({
            ad: event.getAd(),
            start: () => {
              this._startAdsManager();
              this.#startAdCallback = undefined;
            },
            startWithoutReset: () => {
              this._startAdsManager();
            }
          });
        }
        break;
      case AdEvent.Type.AD_BREAK_READY:
        this._resetAd();
        // for a VMAP schedule
        if (this.#startAdCallback) {
          this.#startAdCallback({
            adBreakTime: event.getAdData().adBreakTime,
            start: () => {
              this._startAdsManager();
              // we reset after we received the first
              // start() after preroll
              this.#startAdCallback = undefined;
            },
            startWithoutReset: () => {
              this._startAdsManager();
            }
          });
        } else {
          this._startAdsManager();
        }
        break;
      case AdEvent.Type.STARTED:
        const ad = this.#currentAd = event.getAd();
        // when playing an ad-pod IMA uses two video-tags
        // and switches between those but does not set volume
        // on both video-tags. Calling setVolume with the
        // previously stored volume synchronizes volume with
        // the other video-tag
        if (ad.getAdPodInfo().getAdPosition() > 1) {
          this.#adsManager.setVolume(this.#adsManager.getVolume());
        }
        this.#adElement.classList.remove('nonlinear');
        this._resizeAdsManager();
        // single or non-linear ads
        if (!ad.isLinear()) {
          this.#adElement.classList.add('nonlinear');
          this._playContent();
        } else {
          this.#customPlayhead.disable();
          this.#adDuration = ad.getDuration();
          this.#adCurrentTime = 0;
        }
        this.#adElement.style.display = '';
        break;
      case AdEvent.Type.ALL_ADS_COMPLETED:
        if (this.#customPlaybackTimeAdjustedOnEnded) {
          return;
        }
        if (
          this._isCustomPlaybackUsed()
          && Boolean(this.#currentAd)
          && this.#currentAd.getAdPodInfo().getTimeOffset() !== -1
        ) {
          // on iOS it sometimes only triggers ALL_ADS_COMPLETED
          // before CONTENT_RESUME_REQUESTED
          this._playContent();
        }
        this.reset();
        break;
      case AdEvent.Type.CONTENT_PAUSE_REQUESTED:
        this._resetAd();
        this.#currentAd = event.getAd();
        this.#adElement.style.display = '';
        this.#mediaElement.pause();
        this._resizeAdsManager();
        if (this.#currentAd) {
          this._adjustCuePoints(this.#currentAd.getAdPodInfo().getTimeOffset());
        }
        // synchronize volume state because IMA does not do that
        this.#adsManager.setVolume(
          this.#mediaElement.muted ? 0 : this.#mediaElement.volume
        );
        // pause requested is a signal that an adbreak with a linear ad got started
        this.#customPlayhead.disable();
        this.#adDuration = this.#currentAd.getDuration();
        this.#adCurrentTime = 0;
        break;
      case AdEvent.Type.CONTENT_RESUME_REQUESTED:
        const adPlayedPreviously = Boolean(this.#currentAd);
        // synchronize ad volume state back to content
        // because IMA does not do that
        if (adPlayedPreviously) {
          const adVolume = this.#adsManager.getVolume();
          if (adVolume === 0) {
            this.#mediaElement.muted = true;
          } else {
            this.#mediaElement.muted = false;
            this.#mediaElement.volume = this.#adsManager.getVolume();
          }
        }
        if (this.#customPlaybackTimeAdjustedOnEnded) {
          // Fixing the issue on iOS and postroll where we have to
          // adjust current time.
          // We jump back to the content end, so that "ended" is assigned again.
          this.#mediaElement.currentTime = this.#mediaElement.duration + 1;
          this.#customPlaybackTimeAdjustedOnEnded = false;
        }

        if (this.#mediaElement.ended) {
          // after postroll
          this.reset();
          this._mediaStop();
        } else {
          this._resetAd();
        }
        // only start playback when there previously was an ad
        // CONTENT_RESUME_REQUESTED also gets triggered when "start"
        // is not called on preroll when "loadAds" is used
        if (adPlayedPreviously) {
          this._playContent();
        }
        break;
      case AdEvent.Type.AD_METADATA:
        this._setCuePoints(this.#adsManager.getCuePoints());
        if (this.#cuePoints.indexOf(0) === -1) {
          if (!this.#startAdCallback) {
            this._playContent();
          } else {
            this.#startAdCallback({
              start: () => {
                this._playContent();
                this.#startAdCallback = undefined;
              },
              startWithoutReset: () => {
                this._playContent();
              }
            })
          }
        }
        break;
      case AdEvent.Type.AD_PROGRESS:
        const adDataProgress = event.getAdData();
        this.#adCurrentTime = adDataProgress.currentTime;
        this.#adDuration = adDataProgress.duration;
        break;
      case AdEvent.Type.LOG:
        const adData = event.getAdData();
        // called when an error occurred in VMAP (e.g. empty preroll)
        if (this.#startAdCallback) {
          this.#startAdCallback({
            start: () => {
              this._playContent();
              this.#startAdCallback = undefined;
            },
            startWithoutReset: () => {
              this._playContent();
            }
          })
        } else if (adData.adError) {
          this._playContent();
        }
        break;
    }
  }

  private _onAdsManagerLoaded(loadedEvent: google.ima.AdsManagerLoadedEvent) {
    const { AdEvent, AdErrorEvent: { Type: { AD_ERROR } } } = this.#ima;
    window.clearTimeout(this.#requestAdsTimeout);
    const adsManager = this.#adsManager = loadedEvent.getAdsManager(
      this.#customPlayhead, this.#adsRenderingSettings
    );

    Object.keys(AdEvent.Type).forEach((imaEventName) => {
      adsManager.addEventListener(AdEvent.Type[imaEventName], (event) => {
        this._handleAdsManagerEvents(
          event
        );
        if (PlayerEvent[imaEventName]) {
          const isEventWithAdData = ['LOG', 'AD_PROGRESS'].indexOf(imaEventName) > -1;
          this.dispatchEvent(new CustomEvent(PlayerEvent[imaEventName], {
            detail: {
              ad: event.getAd() || this.#currentAd,
              adData: isEventWithAdData ? event.getAdData() : {}
            }
          }));
        }
      });
    });
    adsManager.addEventListener(AD_ERROR, (event) => this._onAdError(
      this._createPlayerErrorFromImaErrorEvent(event)
    ));

    // start ad playback
    try {
      adsManager.init(this.#width, this.#height, this._getViewMode());
      // initial sync of volume so that muted autoplay works
      adsManager.setVolume(
        this.#mediaElement.muted ? 0 : this.#mediaElement.volume
      );
      // ensure to initialize the ad container at least once before
      // starting it. For playback with sound it requires a synchronous
      // .activate()
      this.#adDisplayContainer.initialize();
      if (!this.#startAdCallback) {
        this._startAdsManager();
      }
    } catch (adError) {
      this._onAdError(new PlayerError(adError.message));
    }
  }

  private _startAdsManager() {
    if (!this.#mediaStartTriggered) {
      this.dispatchEvent(
        new CustomEvent(PlayerEvent.MEDIA_START)
      );
      this.#mediaStartTriggered = true;
    }
    if (this.#adsManager) {
      try {
        this.#adsManager.start();
      } catch(error) {
        this._onAdError(new PlayerError(error.message));
      }
    }
  }

  private _isCustomPlaybackUsed() {
    const { settings } = this.#ima;
    return settings.getDisableCustomPlaybackForIOS10Plus() === false
      && !this.#adElement.querySelector('video');
  }

  private _mediaStop() {
    setTimeout(() => {
      this.#mediaImpressionTriggered = false;
      this.#mediaStartTriggered = false;
      this.#customPlaybackTimeAdjustedOnEnded = false;
      this.dispatchEvent(
        new CustomEvent(PlayerEvent.MEDIA_STOP)
      );
    }, 1);
  }

  private _resizeObserverCallback(entries) {
    for (const entry of entries) {
      if (entry.contentBoxSize && entry.contentBoxSize.length === 1) {
        this.#width = entry.contentBoxSize[0].inlineSize;
        this.#height = entry.contentBoxSize[0].blockSize;
      } else if (entry.contentBoxSize && entry.contentBoxSize.inlineSize) {
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
      this.resizeAd(this.#width, this.#height);
    } else if (ad) {
      if (ad.getWidth() > this.#width || ad.getHeight() > this.#height) {
        this.resizeAd(this.#width, this.#height);
      } else {
        // in case we won't add pixels in height here it triggers a VAST error
        // that there is not enough space to render the nonlinear ad
        // when "useStyledNonLinearAds" is given the height needs to be higher so
        // that the close button fits in
        this.#adsManager.resize(ad.getWidth(), ad.getHeight() + 20, viewMode);
        this.#adElement.style.width = `${ad.getWidth()}px`;
        this.#adElement.style.height = `${ad.getHeight() + 20}px`;
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
    this.#adElement.style.display = 'none';
    if (!this.#mediaElement.ended) {
      this.#customPlayhead.enable();
      this.#mediaElement.play();
    }
  }

  private _createPlayerErrorFromImaErrorEvent(event: google.ima.AdErrorEvent) {
    const error = event.getError();
    const playerError = new PlayerError(error.getMessage());
    playerError.type = error.getType();
    playerError.errorCode = error.getErrorCode();
    playerError.vastErrorCode = error.getVastErrorCode && error.getVastErrorCode();
    playerError.innerError = error.getInnerError();
    return playerError;
  }

  private _onAdError(error: PlayerError) {
    this.dispatchEvent(new CustomEvent(PlayerEvent.AD_ERROR, {
      detail: { error }
    }));
    this._resetAd();
    if (this.#startAdCallback) {
      this.#startAdCallback({
        start: () => {
          this._playContent();
          this.#startAdCallback = undefined;
        },
        startWithoutReset: () => {
          this._playContent();
        }
      })
    } else {
      this._playContent();
    }
  }
}

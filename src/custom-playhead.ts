/**
 * Improved version of: https://developers.google.com/interactive-media-ads/docs/sdks/html5/ad-rules#known-issues-with-mobile-safari
 */
export class CustomPlayhead {
  #mediaElement: HTMLVideoElement;
  #currentTime: number;
  #enabled: boolean;
  seeking: boolean;

  constructor(mediaElement) {
    this.#mediaElement = mediaElement;
    this.#currentTime = 0;
    this.#enabled = false;
    this.seeking = false;
    this._onTimeupdate = this._onTimeupdate.bind(this);
    this._onSeeking = this._onSeeking.bind(this);
    this._onSeeked = this._onSeeked.bind(this);
    this.enable();
  }

  private _onSeeking() {
    this.seeking = true;
  }

  private _onSeeked() {
    this.seeking = false;
  }

  private _onTimeupdate() {
    if (!this.seeking && !this.#mediaElement.paused) {
      this.#currentTime = this.#mediaElement.currentTime;
    }
  }

  get enabled() {
    return this.#enabled;
  }

  enable() {
    if (this.#enabled) return;
    this.#mediaElement.addEventListener('seeking', this._onSeeking);
    this.#mediaElement.addEventListener('seeked', this._onSeeked);
    this.#mediaElement.addEventListener('timeupdate', this._onTimeupdate);
    this.#enabled = true;
  }

  disable() {
    this.#mediaElement.removeEventListener('seeking', this._onSeeking);
    this.#mediaElement.removeEventListener('seeked', this._onSeeked);
    this.#mediaElement.removeEventListener('timeupdate', this._onTimeupdate);
    this.#enabled = false;
  }

  get currentTime() {
    return this.#currentTime;
  }

  get duration() {
    return this.#mediaElement.duration;
  }

  get muted() {
    return this.#mediaElement.muted;
  }

  get volume() {
    return this.#mediaElement.volume;
  }

  play() {
    this.#mediaElement.play();
  }

  pause() {
    this.#mediaElement.pause();
  }

  reset() {
    this.#currentTime = 0;
    this.#enabled = false;
    this.seeking = false;
    this.enable();
  }

  destroy() {
    this.disable();
    this.#mediaElement = undefined;
  }
}

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
    this._ontimeupdate = this._ontimeupdate.bind(this);
    this._onseeking = this._onseeking.bind(this);
    this._onseeked = this._onseeked.bind(this);
    this.enable();
  }

  private _onseeking() {
    this.seeking = true;
  }

  private _onseeked() {
    this.seeking = false;
  }

  private _ontimeupdate() {
    if (!this.seeking && !this.#mediaElement.paused) {
      this.#currentTime = this.#mediaElement.currentTime;
    }
  }

  get enabled() {
    return this.#enabled;
  }

  enable() {
    if (this.#enabled) return;
    this.#mediaElement.addEventListener('seeking', this._onseeking);
    this.#mediaElement.addEventListener('seeked', this._onseeked);
    this.#mediaElement.addEventListener('timeupdate', this._ontimeupdate);
    this.#enabled = true;
  }

  disable() {
    if (!this.#enabled) return;
    this.#mediaElement.removeEventListener('seeking', this._onseeking);
    this.#mediaElement.removeEventListener('seeked', this._onseeked);
    this.#mediaElement.removeEventListener('timeupdate', this._ontimeupdate);
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

  destroy() {
    this.disable();
    this.#mediaElement = undefined;
  }
}

import formToObject from 'form-to-object';

const { vastImaPlayer, google, bulmaSlider, document } = window;

export function connectPageEvents() {
  // Get all "navbar-burger" elements
  var navBurgers = Array.prototype.slice.call(document.querySelectorAll('.navbar-burger'), 0);
  // Check if there are any navbar burgers
  if (navBurgers.length > 0) {
    // Add a click event on each of them
    navBurgers.forEach(function(el) {
      el.addEventListener('click', function() {
        // Get the target from the "data-target" attribute
        const target = document.getElementById(el.dataset.target);
        // Toggle the "is-active" class on both the "navbar-burger" and the "navbar-menu"
        el.classList.toggle('is-active');
        target.classList.toggle('is-active');
      });
    });
  }

  var addPlayerForm = document.querySelector('#addPlayerForm');
  addPlayerForm.addEventListener('submit', function(event) {
    event.preventDefault();
    addVastImaPlayer(
      convertFormToObject(addPlayerForm)
    );
  });

  const vpaidMode = document.querySelector('#vpaidMode');
  const numRedirects = document.querySelector('#numRedirects');
  const locale = document.querySelector('#locale');
  google.ima.settings.setNumRedirects(Number(numRedirects.value));
  google.ima.settings.setLocale(locale.value);
  google.ima.settings.setVpaidMode(
    google.ima.ImaSdkSettings.VpaidMode[vpaidMode.value]
  );

  vpaidMode.addEventListener('change', () => {
    google.ima.settings.setVpaidMode(
      google.ima.ImaSdkSettings.VpaidMode[vpaidMode.value]
    );
  });
  numRedirects.addEventListener('change', () => {
    google.ima.settings.setNumRedirects(Number(numRedirects.value));
  });
  locale.addEventListener('change', () => {
    google.ima.settings.setLocale(locale.value);
  });
}

function initializeVastImaPlayer({
  video,
  adContainer,
  enablePreloading,
  loadVideoTimeout,
  useStyledNonLinearAds,
  useStyledLinearAds,
  autoAlign,
  renderAdUiElements
} = {}) {
  const adsRenderingSettings = new google.ima.AdsRenderingSettings();
  adsRenderingSettings.enablePreloading = enablePreloading;
  adsRenderingSettings.loadVideoTimeout = loadVideoTimeout;
  adsRenderingSettings.useStyledNonLinearAds = useStyledNonLinearAds;
  adsRenderingSettings.useStyledLinearAds = useStyledLinearAds;
  adsRenderingSettings.autoAlign = autoAlign;
  if (renderAdUiElements) {
    adsRenderingSettings.uiElements = [
      google.ima.UiElements.COUNTDOWN,
      google.ima.UiElements.AD_ATTRIBUTION
    ];
  } else {
    adsRenderingSettings.uiElements = [];
  }

  const adImaPlayerOptions = new vastImaPlayer.PlayerOptions();
  adImaPlayerOptions.clickTrackingElement = adContainer;
  adImaPlayerOptions.disableCustomPlaybackForIOS10Plus = false;
  adImaPlayerOptions.autoResize = true;

  return new vastImaPlayer.Player(
    google.ima, video, adContainer,
    adsRenderingSettings, adImaPlayerOptions
  );
}

let instanceNumber = 0;
function addVastImaPlayer(settings) {
  instanceNumber += 1;
  const domString = `<div class="container">
    <div class="tile is-ancestor is-parent">
      <div class="tile is-8 is-child box">
        <div class="playerContainer">
          <video ${settings.muted ? 'muted ' : ''}controls playsinline poster="https://glomex.github.io/vast-ima-player/big-buck-bunny.png" preload="none">
            <source type="video/mp4" src="https://glomex.github.io/vast-ima-player/big-buck-bunny.mp4">
          </video>
          <div class="adContainer"></div>
        </div>
        <div class="buttons">
          <button class="button play-button">
            <span title="Play" class="icon is-small">
              <i class="fas fa-play"></i>
            </span>
          </button>
          <button class="button pause-button">
            <span title="Pause" class="icon is-small">
              <i class="fas fa-pause"></i>
            </span>
          </button>
          <button class="button mute-toggle-button">
            <span title="${settings.muted ? 'Unmute' : 'Mute'}" class="icon is-small">
              <i class="fas ${settings.muted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>
            </span>
          </button>
          <div title="Adjust Volume" class="button volume-slider">
            <input id="sliderWithValue${instanceNumber}" class="slider has-output" min="0" max="100" value="50" step="1" type="range">
            <output for="sliderWithValue${instanceNumber}">50</output>
          </div>
        </div>
      </div>
      <div class="tile is-child box">
        <nav class="panel">
          <p class="panel-heading">
            Ad Settings
          </p>
          <div class="control" style="padding: 1em;">
            <div class="field">
              <label class="label">VAST-URL</label>
              <div class="control">
                <span class="select">
                <select name="vastUrl">
                  <option selected value="https://glomex.github.io/vast-ima-player/linear-ad.xml">Linear VAST 4s</option>
                  <option value="https://glomex.github.io/vast-ima-player/nonlinear-ad.xml">Nonlinear VAST</option>
                </select>
              </span>
              </div>
            </div>
            <button class="button is-info" name="playVast">Play VAST</button>
          </div>
        </nav>
      </div>
    </div>
  </div>`;
  const element = document.createElement('section');
  element.classList.add('section');
  element.innerHTML = domString;
  document.body.appendChild(element);
  const video = element.querySelector('video');
  const adContainer = element.querySelector('.adContainer');
  const vastImaPlayer = initializeVastImaPlayer({
    video,
    adContainer,
    ...settings
  });
  bulmaSlider.attach();
  updateExternalPlayerControls(element, vastImaPlayer);
  connectElementEvents(element, vastImaPlayer);
}

function connectElementEvents(element, vastImaPlayer) {
  const video = element.querySelector('video');
  const vastUrlSelect = element.querySelector('[name=vastUrl]');
  const playVastButton = element.querySelector('[name=playVast]');

  element.querySelector('.play-button').addEventListener('click', () => {
    vastImaPlayer.play();
  });

  element.querySelector('.pause-button').addEventListener('click', () => {
    vastImaPlayer.pause();
  });

  const muteToggleButton = element.querySelector('.mute-toggle-button');
  const muteToggleButtonSpan = muteToggleButton.querySelector('span');

  const adjustMutedUi = () => {
    muteToggleButtonSpan.innerHTML = `<i class="fas ${vastImaPlayer.muted ? 'fa-microphone-slash' : 'fa-microphone'}"></i>`;
    if (vastImaPlayer.muted) {
      muteToggleButtonSpan.setAttribute('title', 'Unmute');
    } else {
      muteToggleButtonSpan.setAttribute('title', 'Mute');
    }
  }

  muteToggleButton.addEventListener('click', function() {
    vastImaPlayer.muted = !vastImaPlayer.muted;
  });

  const volumeSlider = element.querySelector('.volume-slider input');
  const volumeSliderOutput = element.querySelector('.volume-slider output');

  volumeSlider.addEventListener('change', function() {
    vastImaPlayer.volume = Number(volumeSlider.value) / 100 || 0;
  });

  video.addEventListener('volumechange', () => {
    volumeSlider.value = video.volume * 100;
    volumeSliderOutput.innerHTML = video.volume * 100;
    adjustMutedUi();
  });

  playVastButton.addEventListener('click', () => {
    const playAdsRequest = new google.ima.AdsRequest();
    playAdsRequest.adTagUrl = vastUrlSelect.value;
    // will start the ad muted
    vastImaPlayer.playAds(playAdsRequest);
  });
}

function updateExternalPlayerControls(element, vastImaPlayer) {
  const currentVolume = String(vastImaPlayer.volume * 100 || 0);
  element.querySelector('.volume-slider input').value = currentVolume;
  element.querySelector('.volume-slider output').innerHTML = currentVolume;
}

function convertFormToObject(form) {
  const object = formToObject(form);
  Object.keys(object).forEach((key) => {
    if (object[key] === 'on') {
      object[key] = true;
    }
  });
  return object;
}

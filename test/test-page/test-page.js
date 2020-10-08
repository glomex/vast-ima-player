import formToObject from 'form-to-object';

const { vastImaPlayer, google, bulmaSlider, document } = window;

const LINEAR_AD_URL = 'https://glomex.github.io/vast-ima-player/linear-ad.xml';
const NOT_FOUND_AD_URL = 'https://glomex.github.io/vast-ima-player/not-found.xml'
const NONLINEAR_AD_URL = 'https://glomex.github.io/vast-ima-player/nonlinear-ad.xml';

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
        <div class="message-header">
          Ad Playback
          <button class="delete is-large remove-button">Delete</button>
        </div>
        <nav class="panel">
          <div class="control" style="padding: 1em;">
            <div class="field">
              <label class="label">VAST-URL</label>
              <div class="control">
                <span class="select">
                <select name="vastUrl">
                  <option selected value="${LINEAR_AD_URL}">Linear VAST 4s</option>
                  <option value="${NONLINEAR_AD_URL}">Nonlinear VAST</option>
                  <option value="${NOT_FOUND_AD_URL}">Not Found URL</option>
                </select>
              </span>
              </div>
            </div>
            <div class="buttons">
              <button class="button is-info" name="playVast">Play VAST</button>
              <button class="button is-info" name="loadAndPlayVast">Load VAST</button>
            </div>
            <hr>
            <div class="field">
              <label class="label">VMAP</label>
              <div class="control">
                <span class="select">
                <select name="vmap">
                  <option selected value="[1, 1, 1, 1, true]">Ad-Pods: Pre-, Mid- and Postrolls</option>
                  <option value="[0, 0, 0, 1, true]">Ad-Pods: Only Postroll</option>
                  <option value="[0, 0, 0, 0, true]">No Ad Breaks</option>
                  <option value="[2, 2, 2, 2, true]">Ad-Pods 2x: Pre-, Mid- and Postrolls</option>
                  <option value="[2, 2, 2, 2, false]">No Ad-Pods 2x: Pre-, Mid- and Postrolls</option>
                </select>
              </span>
              </div>
            </div>
            <div class="buttons">
              <button class="button is-info" name="playVmap">Play VMAP</button>
              <button class="button is-info" name="loadAndPlayVmap">Load VMAP</button>
            </div>
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
  updateExternalPlayerControls(element, vastImaPlayer);
  connectElementEvents(element, vastImaPlayer);
  bulmaSlider.attach();
}

function connectElementEvents(element, vastImaPlayer) {
  const video = element.querySelector('video');

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

  const vastUrlSelect = element.querySelector('[name=vastUrl]');
  const playVastButton = element.querySelector('[name=playVast]');
  playVastButton.addEventListener('click', () => {
    const playAdsRequest = new google.ima.AdsRequest();
    playAdsRequest.adTagUrl = vastUrlSelect.value;
    vastImaPlayer.playAds(playAdsRequest);
  });

  const loadAndPlayVast = element.querySelector('[name=loadAndPlayVast]');
  let currentVastStart = () => {};
  loadAndPlayVast.addEventListener('click', () => {
    if (loadAndPlayVast.innerHTML === 'Load VAST') {
      loadAndPlayVast.classList.add('is-loading');
      const playAdsRequest = new google.ima.AdsRequest();
      playAdsRequest.adTagUrl = vastUrlSelect.value;
      vastImaPlayer.loadAds(playAdsRequest, ({ start }) => {
        loadAndPlayVast.classList.remove('is-loading');
        loadAndPlayVast.innerHTML = 'Start VAST';
        currentVastStart = start;
      });
    } else {
      currentVastStart();
      loadAndPlayVast.innerHTML = 'Load VAST';
    }
  });

  const vmapSelect = element.querySelector('[name=vmap]');
  const playVmapButton = element.querySelector('[name=playVmap]');
  playVmapButton.addEventListener('click', () => {
    const playAdsRequest = new google.ima.AdsRequest();
    const selectedValue = JSON.parse(vmapSelect.value);
    playAdsRequest.adsResponse = constructVmap({
      prerollCount: selectedValue[0],
      midroll1Count: selectedValue[1],
      midroll2Count: selectedValue[2],
      postrollCount: selectedValue[3],
      useAdPods: Boolean(selectedValue[4])
    });
    vastImaPlayer.playAds(playAdsRequest);
  });
  const loadAndPlayVmap = element.querySelector('[name=loadAndPlayVmap]');
  let currentVmapStart = () => {};
  loadAndPlayVmap.addEventListener('click', () => {
    if (loadAndPlayVmap.innerHTML === 'Load VMAP') {
      loadAndPlayVmap.classList.add('is-loading');
      const playAdsRequest = new google.ima.AdsRequest();
      const selectedValue = JSON.parse(vmapSelect.value);
      playAdsRequest.adsResponse = constructVmap({
        prerollCount: selectedValue[0],
        midroll1Count: selectedValue[1],
        midroll2Count: selectedValue[2],
        postrollCount: selectedValue[3],
        useAdPods: Boolean(selectedValue[4])
      });
      vastImaPlayer.loadAds(playAdsRequest, ({ start }) => {
        loadAndPlayVmap.classList.remove('is-loading');
        loadAndPlayVmap.innerHTML = 'Start VAST';
        currentVmapStart = start;
      });
    } else {
      currentVmapStart();
      loadAndPlayVmap.innerHTML = 'Load VMAP';
    }
  });
  vastImaPlayer.addEventListener('MediaStop', () => {
    loadAndPlayVmap.innerHTML = 'Load VMAP';
  });

  const removeButton = element.querySelector('.remove-button');
  removeButton.addEventListener('click', () => {
    vastImaPlayer.destroy();
    element.parentNode.removeChild(element);
  });
}

function updateExternalPlayerControls(element, vastImaPlayer) {
  const currentVolume = String(vastImaPlayer.volume * 100 || 0);
  element.querySelector('.volume-slider input').value = currentVolume;
  element.querySelector('.volume-slider output').innerHTML = currentVolume;
}

function constructVmap({
  prerollCount,
  midroll1Count,
  midroll2Count,
  postrollCount,
  useAdPods = true
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <VMAP xmlns:vmap="http://www.iab.net/vmap-1.0" version="1.0">
    ${ prerollCount ? createAdBreaks('start', prerollCount, useAdPods) : '' }
    ${ midroll1Count ? createAdBreaks('00:00:10.000', midroll1Count, useAdPods) : '' }
    ${ midroll2Count ? createAdBreaks('00:00:20.000', midroll2Count, useAdPods) : '' }
    ${ postrollCount ? createAdBreaks('end', postrollCount, useAdPods) : '' }
  </VMAP>`
}

function createAdBreaks(position, count, useAdPods) {
  return useAdPods
    ? createVmapAdBreakAsAdPod(position, count)
    : createIndividualVmapAdBreaks(position, count);
}

function createIndividualVmapAdBreaks(position, count) {
  return [...Array(count)].map(() => {
    return `<vmap:AdBreak timeOffset="${position}" breakType="linear">
    <vmap:AdSource allowMultipleAds="true" followRedirects="false">
      <vmap:VASTAdData>
        <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
          <Ad>
          <Wrapper>
            <VASTAdTagURI>
              <![CDATA[${LINEAR_AD_URL}]]>
            </VASTAdTagURI>
          </Wrapper>
        </Ad>
        </VAST>
      </vmap:VASTAdData>
    </vmap:AdSource>
  </vmap:AdBreak>`});
}

function createVmapAdBreakAsAdPod(position, count) {
  return `<vmap:AdBreak timeOffset="${position}" breakType="linear">
    <vmap:AdSource allowMultipleAds="true" followRedirects="false">
      <vmap:VASTAdData>
        <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
          ${ [...Array(count)].map((item, index) => {
            return `<Ad sequence="${index+1}">
              <Wrapper>
                <VASTAdTagURI>
                  <![CDATA[${LINEAR_AD_URL}]]>
                </VASTAdTagURI>
              </Wrapper>
            </Ad>`
          })}
        </VAST>
      </vmap:VASTAdData>
    </vmap:AdSource>
  </vmap:AdBreak>`;
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

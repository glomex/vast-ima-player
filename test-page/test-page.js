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
  renderAdUiElements,
  useAdContainerAsClickElement,
  disableCustomPlaybackForIOS10Plus,
  autoResize
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
  if (useAdContainerAsClickElement) {
    adImaPlayerOptions.clickTrackingElement = adContainer;
  }
  adImaPlayerOptions.disableCustomPlaybackForIOS10Plus = disableCustomPlaybackForIOS10Plus;
  adImaPlayerOptions.autoResize = autoResize;

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
        <video ${settings.muted ? 'muted ' : '' }controls playsinline
          poster="https://glomex.github.io/vast-ima-player/big-buck-bunny.png" preload="none">
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
          <input id="sliderWithValue${instanceNumber}" class="slider has-output" min="0" max="100" value="50" step="1"
            type="range">
          <output for="sliderWithValue${instanceNumber}">50</output>
        </div>
      </div>
    </div>
    <div class="tile is-child box">
      <div class="tabs is-boxed">
        <ul>
          <li class="is-active ad-tag-url-button">
            <a>
              <span>Tag URL</span>
            </a>
          </li>
          <li class="ad-tag-string-button">
            <a>
              <span>Tag String</span>
            </a>
          </li>
          <li class="player-log-button">
            <a>
              <span>Log</span>
            </a>
          </li>
        </ul>
        <button style="float:right;" class="delete is-large remove-button">Delete</button>
      </div>
      <div class="ad-tag-url-screen">
        <div class="field">
          <label class="label">VAST URL</label>
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
          <label class="label">Manual</label>
          <div class="control">
            <input name="vastUrlManual" class="input" type="text" placeholder="...add your Ad-Tag-URL here ...">
          </div>
        </div>
        <div class="buttons">
          <button class="button is-info" name="playVastUrlManual">Play Ad-Tag</button>
          <button class="button is-info" name="loadAndPlayVastUrlManual">Load Ad-Tag</button>
        </div>
      </div>
      <div class="ad-tag-string-screen" style="display:none;">
        <div class="field">
          <label class="label">VMAP</label>
          <div class="control">
            <span class="select">
              <select name="vmap">
                <option selected value="[1, 1, 1, 1, true]">Ad-Pods: Pre-, Mid- and Postrolls</option>
                <option value="[0, 0, 0, 1, true]">Ad-Pods: Only Postroll</option>
                <option value="[1, 0, 0, 0, true]">Ad-Pods: Only Preroll</option>
                <option value="[0, 0, 0, 0, true]">No Ad Breaks</option>
                <option value="[2, 2, 2, 2, true]">Ad-Pods 2x: Pre-, Mid- and Postrolls</option>
                <option value="[2, 2, 2, 2, false]">No Ad-Pods 2x: Pre-, Mid- and Postrolls</option>
                <option value="[1, 1, 1, 1, false, true]">Ad-Waterfall: Pre- Mid- and Postrolls</option>
                <option value="[2, 0, 0, 0, false, true]">Ad-Waterfall 2x: Only Preroll</option>
                <option value="[1, 0, 0, 1, false, false, true]">Nonlinear Preroll and Linear Postroll</option>
                <option value="[1, 0, 0, 0, false, false, true]">Nonlinear Preroll only</option>
                <option value="[1, 0, 1, 0, false, false, true]">Nonlinear Preroll and Linear Midroll-2</option>
              </select>
            </span>
          </div>
        </div>
        <div class="buttons">
          <button class="button is-info" name="playVmap">Play VMAP</button>
          <button class="button is-info" name="loadAndPlayVmap">Load VMAP</button>
        </div>
        <hr>
        <div class="field">
          <label class="label">Manual</label>
          <div class="control">
            <textarea name="adsResponseString" class="textarea is-small" placeholder="...enter your ads response here..."></textarea>
          </div>
        </div>
        <div class="buttons">
          <button class="button is-info" name="playAdsResponseString">Play</button>
          <button class="button is-info" name="loadAndPlayAdsResponseString">Load</button>
        </div>
      </div>
      <div class="player-log-screen" style="display:none;">
        <div class="field">
          <div class="control">
            <textarea rows="16" wrap="off" class="textarea is-small" readonly placeholder="...player log will appear here..."></textarea>
          </div>
        </div>
        <button class="button is-info" name="resetLog">Reset</button>
      </div>
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

  const adTagUrlButton = element.querySelector('.ad-tag-url-button');
  const adTagUrlScreen = element.querySelector('.ad-tag-url-screen');
  const adTagStringButton = element.querySelector('.ad-tag-string-button');
  const adTagStringScreen = element.querySelector('.ad-tag-string-screen');
  const playerLogButton = element.querySelector('.player-log-button');
  const playerLogScreen = element.querySelector('.player-log-screen');

  adTagUrlButton.addEventListener('click', () => {
    playerLogScreen.style.display = 'none';
    adTagStringScreen.style.display = 'none';
    adTagUrlScreen.style.display = 'block';
    playerLogButton.classList.remove('is-active');
    adTagStringButton.classList.remove('is-active');
    adTagUrlButton.classList.add('is-active');
  });
  adTagStringButton.addEventListener('click', () => {
    playerLogScreen.style.display = 'none';
    adTagStringScreen.style.display = 'block';
    adTagUrlScreen.style.display = 'none';
    playerLogButton.classList.remove('is-active');
    adTagStringButton.classList.add('is-active');
    adTagUrlButton.classList.remove('is-active');
  });
  playerLogButton.addEventListener('click', () => {
    adTagUrlScreen.style.display = 'none';
    adTagStringScreen.style.display = 'none';
    playerLogScreen.style.display = 'block';
    playerLogButton.classList.add('is-active');
    adTagStringButton.classList.remove('is-active');
    adTagUrlButton.classList.remove('is-active');
  });

  connectPlayerEventsToLog(element, vastImaPlayer);

  // Section: VAST-URL
  const vastUrlSelect = element.querySelector('[name=vastUrl]');
  const playVastButton = element.querySelector('[name=playVast]');
  playVastButton.addEventListener('click', () => {
    const playAdsRequest = new google.ima.AdsRequest();
    playAdsRequest.adTagUrl = vastUrlSelect.value;
    playAdsRequest.vastLoadTimeout = settings.vastLoadTimeout;
    vastImaPlayer.playAds(playAdsRequest);
  });
  const loadAndPlayVast = element.querySelector('[name=loadAndPlayVast]');
  setupLoadAndPlayButton(
    loadAndPlayVast,
    'Start VAST',
    () => {
      const playAdsRequest = new google.ima.AdsRequest();
      playAdsRequest.adTagUrl = vastUrlSelect.value;
      playAdsRequest.vastLoadTimeout = settings.vastLoadTimeout;
      return playAdsRequest
    },
    vastImaPlayer
  );

  // Section: Manual VAST-URL
  const vastUrlManual = element.querySelector('[name=vastUrlManual]');
  const playVastUrlManualButton = element.querySelector('[name=playVastUrlManual]');
  playVastUrlManualButton.addEventListener('click', () => {
    const playAdsRequest = new google.ima.AdsRequest();
    playAdsRequest.adTagUrl = vastUrlManual.value;
    playAdsRequest.vastLoadTimeout = settings.vastLoadTimeout;
    vastImaPlayer.playAds(playAdsRequest);
  });
  const loadAndPlayVastUrlManual = element.querySelector('[name=loadAndPlayVastUrlManual]');
  setupLoadAndPlayButton(
    loadAndPlayVastUrlManual,
    'Start Ad-Tag',
    () => {
      const playAdsRequest = new google.ima.AdsRequest();
      playAdsRequest.adTagUrl = vastUrlManual.value;
      playAdsRequest.vastLoadTimeout = settings.vastLoadTimeout;
      return playAdsRequest;
    },
    vastImaPlayer
  );

  // Section: VMAP examples
  const vmapSelect = element.querySelector('[name=vmap]');
  const playVmapButton = element.querySelector('[name=playVmap]');
  const createVmapAdsRequest = () => {
    const playAdsRequest = new google.ima.AdsRequest();
    const selectedValue = JSON.parse(vmapSelect.value);
    playAdsRequest.vastLoadTimeout = settings.vastLoadTimeout;
    playAdsRequest.adsResponse = constructVmap({
      prerollCount: selectedValue[0],
      midroll1Count: selectedValue[1],
      midroll2Count: selectedValue[2],
      postrollCount: selectedValue[3],
      useAdPods: Boolean(selectedValue[4]),
      useAdWaterfall: Boolean(selectedValue[5]),
      placeNonlinearAdOnPreoll: Boolean(selectedValue[6])
    });
    element.querySelector('[name=adsResponseString]').value = playAdsRequest.adsResponse;
    return playAdsRequest;
  }
  playVmapButton.addEventListener('click', () => {
    vastImaPlayer.playAds(createVmapAdsRequest());
  });
  const loadAndPlayVmap = element.querySelector('[name=loadAndPlayVmap]');
  setupLoadAndPlayButton(
    loadAndPlayVmap,
    'Start VMAP',
    createVmapAdsRequest,
    vastImaPlayer
  );

  // Section Manual Ads-Response
  const adsResponseString = element.querySelector('[name=adsResponseString]');
  const playAdsResponseString = element.querySelector('[name=playAdsResponseString]');
  const createStringAdsRequest = () => {
    const playAdsRequest = new google.ima.AdsRequest();
    playAdsRequest.adsResponse = adsResponseString.value;
    playAdsRequest.vastLoadTimeout = settings.vastLoadTimeout;
    return playAdsRequest;
  }
  playAdsResponseString.addEventListener('click', () => {
    vastImaPlayer.playAds(createStringAdsRequest());
  });
  const loadAndPlayAdsResponseString = element.querySelector('[name=loadAndPlayAdsResponseString]');
  setupLoadAndPlayButton(
    loadAndPlayAdsResponseString,
    'Start',
    createStringAdsRequest,
    vastImaPlayer
  );

  const removeButton = element.querySelector('.remove-button');
  removeButton.addEventListener('click', () => {
    vastImaPlayer.destroy();
    element.parentNode.removeChild(element);
  });
}

function connectPlayerEventsToLog(element, vastImaPlayer) {
  const textarea = element.querySelector('.player-log-screen textarea');
  const resetLogButton = element.querySelector('.player-log-screen button[name="resetLog"]');

  resetLogButton.addEventListener('click', () => {
    textarea.value = '';
  });

  vastImaPlayer.addEventListener('MediaStart', () => {
    textarea.value += 'MediaStart\n';
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('AdError', (event) => {
    textarea.value += `AdError, ${ JSON.stringify({ errorCode: event.detail.error.errorCode, message: event.detail.error.message }) }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('MediaImpression', () => {
    textarea.value += 'MediaImpression\n';
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('MediaStop', () => {
    textarea.value += 'MediaStop\n';
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('AdMetadata', () => {
    textarea.value += `AdMetadata, ${ JSON.stringify({ cuePoints: vastImaPlayer.cuePoints }) }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('AdStarted', (event) => {
    const adPodInfo = event.detail.ad.getAdPodInfo();
    textarea.value += `AdStarted, ${ JSON.stringify(adPodInfo.g) }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('AdComplete', (event) => {
    const adPodInfo = event.detail.ad.getAdPodInfo();
    textarea.value += `AdComplete, ${ JSON.stringify(adPodInfo.g) }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('AdProgress', () => {
    textarea.value += `AdProgress, duration: ${ vastImaPlayer.duration }, currentTime: ${ vastImaPlayer.currentTime }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('timeupdate', () => {
    textarea.value += `timeupdate, duration: ${ vastImaPlayer.duration }, currentTime: ${ vastImaPlayer.currentTime }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });

  vastImaPlayer.addEventListener('ended', () => {
    textarea.value += `ended, duration: ${ vastImaPlayer.duration }, currentTime: ${ vastImaPlayer.currentTime }\n`;
    textarea.scrollTop = textarea.scrollHeight;
  });
}

function updateExternalPlayerControls(element, vastImaPlayer) {
  const currentVolume = String(vastImaPlayer.volume * 100 || 0);
  element.querySelector('.volume-slider input').value = currentVolume;
  element.querySelector('.volume-slider output').innerHTML = currentVolume;
}

function setupLoadAndPlayButton(
  button, startText, createAdsRequest, vastImaPlayer
) {
  let currentStart = () => {};
  const defaultText = button.innerHTML;
  vastImaPlayer.addEventListener('MediaStop', () => {
    button.innerHTML = defaultText;
  });
  button.addEventListener('click', () => {
    if (button.innerHTML === defaultText) {
      button.classList.add('is-loading');
      vastImaPlayer.loadAds(createAdsRequest(), ({ start }) => {
        button.classList.remove('is-loading');
        button.innerHTML = startText;
        currentStart = start;
      });
    } else {
      currentStart();
      button.innerHTML = defaultText;
    }
  });
}

function constructVmap({
  prerollCount,
  midroll1Count,
  midroll2Count,
  postrollCount,
  useAdPods = true,
  useAdWaterfall = true,
  placeNonlinearAdOnPreoll = false
}) {
  return `<?xml version="1.0" encoding="UTF-8"?>
  <VMAP xmlns:vmap="http://www.iab.net/vmap-1.0" version="1.0">
    ${ prerollCount ? createAdBreaks('start', prerollCount, useAdPods, useAdWaterfall, placeNonlinearAdOnPreoll) : '' }
    ${ midroll1Count ? createAdBreaks('00:00:10.000', midroll1Count, useAdPods, useAdWaterfall, false) : '' }
    ${ midroll2Count ? createAdBreaks('00:00:20.000', midroll2Count, useAdPods, useAdWaterfall, false) : '' }
    ${ postrollCount ? createAdBreaks('end', postrollCount, useAdPods, useAdWaterfall, false) : '' }
  </VMAP>`
}

function createAdBreaks(position, count, useAdPods, useAdWaterfall, useNonlinearAd) {
  if (useNonlinearAd) {
    return useAdPods
      ? createVmapAdBreakAsAdPod(position, count, createNonlinearAd)
      : createIndividualVmapAdBreaks(position, count, createNonlinearAd);
  }
  if (useAdWaterfall) {
    return createIndividualVmapAdBreaks(position, count, createAdWaterfall);
  }
  return useAdPods
    ? createVmapAdBreakAsAdPod(position, count, createLinearAd)
    : createIndividualVmapAdBreaks(position, count, createLinearAd);
}


function createVast(createAd, count = 1, withSequence = false) {
  return `<VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
    ${ [...Array(count)].map((item, index) => {
      return createAd(withSequence ? index+1 : undefined);
    }).join('')}
  </VAST>`
}

function createLinearAd(sequence) {
  return `<Ad${ sequence != null ? ` sequence="${sequence}"` : ''}>
    <Wrapper>
      <VASTAdTagURI>
        <![CDATA[${LINEAR_AD_URL}]]>
      </VASTAdTagURI>
    </Wrapper>
  </Ad>`;
}

function createNonlinearAd(sequence) {
  return `<Ad${ sequence != null ? ` sequence="${sequence}"` : ''}>
    <Wrapper>
      <VASTAdTagURI>
        <![CDATA[${NONLINEAR_AD_URL}]]>
      </VASTAdTagURI>
    </Wrapper>
  </Ad>`;
}

function createAdWaterfall() {
  return `<Ad>
    <Wrapper>
      <Error>https://error?not-found-ad-url</Error>
      <VASTAdTagURI>
        <![CDATA[${NOT_FOUND_AD_URL}]]>
      </VASTAdTagURI>
      <Extensions>
        <Extension type="waterfall" fallback_index="1"/>
      </Extensions>
    </Wrapper>
  </Ad>
  <Ad>
    <InLine>
      <Error>https://error?broken-mediafile</Error>
      <Creatives>
        <Creative>
          <Linear>
            <Duration><![CDATA[ 00:00:00 ]]></Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" bitrate="400" width="0" height="0" type="video/mp4">
                <![CDATA[ https://broken-mediafile ]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
      <Extensions>
        <Extension type="waterfall" fallback_index="1"/>
      </Extensions>
    </InLine>
  </Ad>
  <Ad>
    <InLine>
      <Error>https://error?timeout-mediafile</Error>
      <Creatives>
        <Creative>
          <Linear>
            <Duration><![CDATA[ 00:00:00 ]]></Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" bitrate="400" width="0" height="0" type="video/mp4">
                <![CDATA[ http://10.255.255.1/will_timeout.mp4 ]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
      <Extensions>
        <Extension type="waterfall" fallback_index="1"/>
      </Extensions>
    </InLine>
  </Ad>
  <Ad>
    <Wrapper>
      <VASTAdTagURI>
        <![CDATA[${LINEAR_AD_URL}]]>
      </VASTAdTagURI>
      <Extensions>
        <Extension type="waterfall" fallback_index="1"/>
      </Extensions>
    </Wrapper>
  </Ad>
  <Ad>
    <Wrapper>
      <!-- this should not be played because there was a valid ad before -->
      <VASTAdTagURI>
        <![CDATA[${LINEAR_AD_URL}]]>
      </VASTAdTagURI>
      <Extensions>
        <Extension type="waterfall" fallback_index="1"/>
      </Extensions>
    </Wrapper>
  </Ad>`;
}

function createIndividualVmapAdBreaks(position, count, createAd) {
  return [...Array(count)].map(() => {
    return `<vmap:AdBreak timeOffset="${position}" breakType="linear">
    <vmap:AdSource allowMultipleAds="true" followRedirects="false">
      <vmap:VASTAdData>
        ${ createVast(createAd) }
      </vmap:VASTAdData>
    </vmap:AdSource>
  </vmap:AdBreak>`}).join('');
}

function createVmapAdBreakAsAdPod(position, count, createAd) {
  return `<vmap:AdBreak timeOffset="${position}" breakType="linear">
    <vmap:AdSource allowMultipleAds="true" followRedirects="false">
      <vmap:VASTAdData>
        ${ createVast(createAd, count, true) }
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

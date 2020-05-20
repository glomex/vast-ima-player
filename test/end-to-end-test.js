const vmapWithPreMidAndPostroll = `<?xml version="1.0" encoding="UTF-8"?>
<VMAP xmlns:vmap="http://www.iab.net/vmap-1.0" version="1.0">
<vmap:AdBreak timeOffset="start" breakType="linear" breakId="start-0">
  <vmap:AdSource id="start-0" allowMultipleAds="true" followRedirects="false">
    <vmap:VASTAdData>
    <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
      <Ad sequence="1" id="preroll-1">
        <Wrapper>
          <AdSystem></AdSystem>
          <VASTAdTagURI>
            <![CDATA[https://glomex.github.io/vast-ima-player/linear-ad-1s.xml]]>
          </VASTAdTagURI>
        </Wrapper>
      </Ad>
      <Ad sequence="2" id="preroll-2">
        <Wrapper>
          <AdSystem></AdSystem>
          <VASTAdTagURI>
            <![CDATA[https://glomex.github.io/vast-ima-player/linear-ad-1s.xml]]>
          </VASTAdTagURI>
        </Wrapper>
      </Ad>
    </VAST>
    </vmap:VASTAdData>
  </vmap:AdSource>
</vmap:AdBreak>
<vmap:AdBreak timeOffset="00:00:05.000" breakType="linear" breakId="midroll-0">
  <vmap:AdSource id="midroll-0" allowMultipleAds="true" followRedirects="false">
    <vmap:VASTAdData>
      <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
      <Ad id="midroll-1">
        <Wrapper>
          <AdSystem></AdSystem>
          <VASTAdTagURI>
            <![CDATA[https://glomex.github.io/vast-ima-player/linear-ad-1s.xml]]>
          </VASTAdTagURI>
        </Wrapper>
      </Ad>
      </VAST>
    </vmap:VASTAdData>
  </vmap:AdSource>
</vmap:AdBreak>
<vmap:AdBreak timeOffset="00:00:10.000" breakType="linear" breakId="midroll-1">
  <vmap:AdSource id="midroll-1" allowMultipleAds="true" followRedirects="false">
    <vmap:VASTAdData>
      <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
      <Ad id="midroll-2">
        <Wrapper>
          <AdSystem></AdSystem>
          <VASTAdTagURI>
            <![CDATA[https://glomex.github.io/vast-ima-player/linear-ad-1s.xml]]>
          </VASTAdTagURI>
        </Wrapper>
      </Ad>
      </VAST>
    </vmap:VASTAdData>
  </vmap:AdSource>
</vmap:AdBreak>
<vmap:AdBreak timeOffset="end" breakType="linear" breakId="postroll-0">
  <vmap:AdSource id="postroll-0" allowMultipleAds="true" followRedirects="false">
    <vmap:VASTAdData>
      <VAST xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="vast.xsd" version="3.0">
      <Ad id="postroll">
        <Wrapper>
          <AdSystem></AdSystem>
          <VASTAdTagURI>
            <![CDATA[https://glomex.github.io/vast-ima-player/linear-ad-1s.xml]]>
          </VASTAdTagURI>
        </Wrapper>
      </Ad>
      </VAST>
    </vmap:VASTAdData>
  </vmap:AdSource>
</vmap:AdBreak>
</VMAP>`;

describe("VAST-IMA-Player", () => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 40000;

  let ima;
  let mediaElement;
  let containerElement;
  let adElement;

  beforeEach(() => {
    return window.vastImaPlayer.loadImaSdk().then((googleIma) => {
      ima = googleIma;
      containerElement = document.createElement('div');
      mediaElement = document.createElement('video');
      mediaElement.poster = 'http://localhost:9876/base/docs/big-buck-bunny.png';
      mediaElement.src = 'http://localhost:9876/base/docs/big-buck-bunny.mp4';
      adElement = document.createElement('div');
      containerElement.style.position = 'relative';
      containerElement.style.maxWidth = '600px';
      mediaElement.muted = true;
      mediaElement.style.width = '100%';
      mediaElement.style.height = '100%';
      adElement.style.position = 'absolute';
      adElement.style.top = 0;
      adElement.style.left = 0;
      adElement.style.pointerEvents = 'none';
      document.body.appendChild(containerElement);
      containerElement.appendChild(mediaElement);
      containerElement.appendChild(adElement);
      return new Promise((resolve) => {
        mediaElement.addEventListener('loadedmetadata', resolve);
      });
    });
  });

  afterEach(() => {
    containerElement.parentNode.removeChild(containerElement);
  });

  it("executes events in order when VAST adTagUrl is given", (done) => {
    var adsRenderingSettings = new ima.AdsRenderingSettings();
    var imaPlayer = new vastImaPlayer.Player(
      google.ima,
      mediaElement,
      adElement,
      adsRenderingSettings
    );
    var playAdsRequest = new ima.AdsRequest();
    playAdsRequest.adTagUrl = 'https://glomex.github.io/vast-ima-player/linear-ad-1s.xml';
    const collectedEvents = [];
    imaPlayer.addEventListener('MediaStart', () => collectedEvents.push('MediaStart'));
    imaPlayer.addEventListener('MediaImpression', () => {
      collectedEvents.push([
        'MediaImpression',
        parseInt(imaPlayer.duration, 10),
        parseInt(imaPlayer.currentTime, 10)
      ]);
      imaPlayer.pause();
      imaPlayer.currentTime = (imaPlayer.duration - 1);
      imaPlayer.play();
    });
    imaPlayer.addEventListener('AdStarted', () => {
      collectedEvents.push([
        'AdStarted',
        parseInt(imaPlayer.duration, 10),
        parseInt(imaPlayer.currentTime, 10)
      ]);
    });
    imaPlayer.addEventListener('AdComplete', () => {
      collectedEvents.push([
        'AdComplete',
        parseInt(imaPlayer.duration, 10),
        parseInt(imaPlayer.currentTime, 10)
      ]);
    });
    imaPlayer.addEventListener('AdPaused', () => collectedEvents.push('AdPaused'));
    imaPlayer.addEventListener('AdResumed', () => collectedEvents.push('AdResumed'));
    imaPlayer.addEventListener('AdProgress', () => {
      collectedEvents.push('AdProgress');
      imaPlayer.pause();
      // delay a little, otherwise it is not assumed to be paused
      setTimeout(() => {
        imaPlayer.play();
      }, 1);
    }, { once: true });
    imaPlayer.addEventListener('play', () => collectedEvents.push('play'));
    imaPlayer.addEventListener('pause', () => collectedEvents.push('pause'));
    imaPlayer.addEventListener('timeupdate', () => collectedEvents.push('timeupdate'), { once: true });
    imaPlayer.addEventListener('ended', () => collectedEvents.push('ended'));

    imaPlayer.playAds(playAdsRequest);

    imaPlayer.addEventListener('MediaStop', () => {
      collectedEvents.push('MediaStop');
      imaPlayer.destroy();
      expect(collectedEvents).toEqual([
        'MediaStart',
        'play',
        'pause',
        ['AdStarted', 1, 0],
        'AdProgress',
        'AdPaused',
        'AdResumed',
        ['AdComplete', 1, 1],
        'play',
        ['MediaImpression', 23, 0],
        'timeupdate',
        'pause',
        'play',
        'pause',
        'ended',
        'MediaStop'
      ]);
      done();
    });
  });

  it("executes events in order when VMAP adsRespone is given", (done) => {
    var adsRenderingSettings = new ima.AdsRenderingSettings();
    var imaPlayer = new vastImaPlayer.Player(
      google.ima,
      mediaElement,
      adElement,
      adsRenderingSettings
    );
    var playAdsRequest = new ima.AdsRequest();
    playAdsRequest.adsResponse = vmapWithPreMidAndPostroll;
    const collectedEvents = [];
    imaPlayer.addEventListener('MediaStart', () => collectedEvents.push('MediaStart'));
    imaPlayer.addEventListener('MediaImpression', () => {
      collectedEvents.push('MediaImpression');
      imaPlayer.pause();
      // jump after midroll and shortly in front of end
      imaPlayer.currentTime = (imaPlayer.duration - 1);
      imaPlayer.play();
    });
    imaPlayer.addEventListener('AdStarted', (event) => {
      collectedEvents.push([
        'AdStarted',
        event.detail.ad.getAdPodInfo().getTotalAds(),
        event.detail.ad.getAdPodInfo().getAdPosition(),
        event.detail.ad.getWrapperAdIds()[0],
        event.detail.ad.getAdPodInfo().getTimeOffset(),
      ]);
    });
    imaPlayer.addEventListener('AdComplete', (event) => {
      collectedEvents.push([
        'AdComplete',
        event.detail.ad.getAdPodInfo().getTotalAds(),
        event.detail.ad.getAdPodInfo().getAdPosition(),
        event.detail.ad.getWrapperAdIds()[0],
        event.detail.ad.getAdPodInfo().getTimeOffset()
      ]);
    });
    imaPlayer.addEventListener('ended', () => collectedEvents.push('ended'));

    imaPlayer.playAds(playAdsRequest);

    imaPlayer.addEventListener('MediaStop', () => {
      collectedEvents.push('MediaStop');
      imaPlayer.destroy();
      expect(collectedEvents).toEqual([
        'MediaStart',
        ['AdStarted', 2, 1, 'preroll-1', 0],
        ['AdComplete', 2, 1, 'preroll-1', 0],
        ['AdStarted', 2, 2, 'preroll-2', 0],
        ['AdComplete', 2, 2, 'preroll-2', 0],
        'MediaImpression',
        ['AdStarted', 1, 1, 'midroll-2', 10],
        ['AdComplete', 1, 1, 'midroll-2', 10],
        'ended',
        ['AdStarted', 1, 1, 'postroll', -1],
        ['AdComplete', 1, 1, 'postroll', -1],
        'MediaStop'
      ]);
      done();
    });
  });

  it("resizes ad display container to nonlinear ad size", (done) => {
    var adsRenderingSettings = new ima.AdsRenderingSettings();
    var imaPlayer = new vastImaPlayer.Player(
      google.ima,
      mediaElement,
      adElement,
      adsRenderingSettings
    );
    var playAdsRequest = new ima.AdsRequest();
    playAdsRequest.adTagUrl = 'https://glomex.github.io/vast-ima-player/nonlinear-ad.xml';
    imaPlayer.addEventListener('AdStarted', () => {
      const { offsetWidth, offsetHeight } = adElement.firstChild;
      imaPlayer.destroy();
      expect([offsetWidth, offsetHeight]).toEqual([
        480, 78
      ]);
      done();
    });
    imaPlayer.addEventListener('AdError', (event) => {
      throw event.error;
    });
    imaPlayer.playAds(playAdsRequest);
  });
});

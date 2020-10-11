# VAST-IMA-Player

**VAST-IMA-Player** is a convenience layer around [Google Interactive Media Ads HTML5 SDK](https://developers.google.com/interactive-media-ads/docs/sdks/html5) (short: IMA) which tries to make using IMA less cumbersome for common monetization usecases.

This library can be used to build a simple outstream player or it can be used to implement more complex monetization scenarios. VAST-IMA-Player can monetize any content media player (with pre-, mid and postrolls), which follows the browser-built-in [HTMLMediaElement API](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement).

[View Documentation](https://glomex.github.io/vast-ima-player) | [View Test-Page](http://unpkg.com/@glomex/vast-ima-player@1/test-page/index.html)

[![gzip size](http://img.badgesize.io/https://unpkg.com/@glomex/vast-ima-player@1/dist/vast-ima-player.umd.js?compression=gzip&label=gzip)](https://unpkg.com/@glomex/vast-ima-player@1/dist/vast-ima-player.umd.js) [![brotli size](http://img.badgesize.io/https://unpkg.com/@glomex/vast-ima-player@1/dist/vast-ima-player.umd.js?compression=brotli&label=brotli)](https://unpkg.com/@glomex/vast-ima-player@1/dist/vast-ima-player.umd.js)

## Testing

Open the test-page: http://unpkg.com/@glomex/vast-ima-player@1/test-page/index.html

Or checkout this repository and execute the end-to-end tests via `npm test`. You can also start a local webserver via `npm start` and then open the http://localhost:5000/test-page/.

## License

[Apache 2.0 License](https://oss.ninja/apache-2.0-header/glomex)

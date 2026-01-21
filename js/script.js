/* Author:

  Roel van der Ven / Tomás Senart
  Music Hack Day London, December 2011

  Updated 2026: OAuth2 + HLS Streaming Support
*/

$.fn.ready(function() {

  // Declare main vars
  var doc = document,
      win = window;

  // Cloudflare Worker URL for OAuth2 token exchange
  var tokenEndpoint = 'https://owl-octave-token.hello-396.workers.dev';

  // Show loading state initially
  $('.keys').html('<p style="color: white; text-align: center; padding: 50px; font-size: 18px;">Loading owl sounds...</p>');

  // The player callbacks
  var owls = {
    callbacks: {
      play: function(owl) {
        $('#owl-' + owl.id)
          .removeClass('stopped')
          .removeClass('buffering')
          .addClass('playing');
      },
      pause: function(owl) {
        $('#owl-' + owl.id)
          .removeClass('playing')
          .removeClass('buffering')
          .addClass('stopped');
      },
      error: function(owl, error) {
        console.error('Error playing owl ' + owl.id + ':', error);
        $('#owl-' + owl.id)
          .removeClass('playing')
          .removeClass('buffering')
          .addClass('stopped error');
      }
    },
    render: function(owl) {
      return '<a id="owl-' + owl.id + '" class="owl stopped" href="#" title="' + owl.title + '" style="background-image: url(img/' + owl.index + '.png)"></a>';
    },
    data: {},
    stopAll: function() {
      Object.keys(owls.data).forEach(function(key) {
        var owl = owls.data[key];
        if (owl.audio) {
          owl.audio.pause();
          owl.audio.currentTime = 0;
        }
        // Clean up HLS instances
        if (owl.hls) {
          owl.hls.destroy();
          owl.hls = null;
        }
      });
    }
  };

  // Use event delegation to handle clicks (replaces deprecated .live())
  $(document).on('click', '.owl', function(e) {
    e.preventDefault();
    var owl = owls.data[+this.id.split('-')[1]];

    if (!owl || !owl.audio) {
      console.error('Owl data not found');
      return;
    }

    // Stop all other owls first
    owls.stopAll();

    // Play the clicked owl
    owl.audio.play()
      .catch(function(error) {
        owls.callbacks.error(owl, error);
      });

    $('h2:first').html(owl.title);
  });

  // Function to create audio element with HLS support
  function createAudioWithHLS(hlsUrl, owl) {
    var audio = new Audio();

    // Add event listeners
    audio.addEventListener('play', owls.callbacks.play.bind(null, owl), false);
    audio.addEventListener('pause', owls.callbacks.pause.bind(null, owl), false);
    audio.addEventListener('ended', owls.callbacks.pause.bind(null, owl), false);
    audio.addEventListener('error', function(e) {
      owls.callbacks.error(owl, e);
    }, false);

    // Check if browser supports HLS natively (Safari)
    if (audio.canPlayType('application/vnd.apple.mpegurl')) {
      audio.src = hlsUrl;
    }
    // Otherwise use hls.js (Chrome, Firefox, Edge)
    else if (typeof Hls !== 'undefined' && Hls.isSupported()) {
      var hls = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.on(Hls.Events.ERROR, function(event, data) {
        if (data.fatal) {
          console.error('HLS fatal error:', data);
          owls.callbacks.error(owl, data);
        }
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(audio);
      owl.hls = hls; // Store for cleanup
    } else {
      console.error('HLS is not supported in this browser');
      owls.callbacks.error(owl, 'HLS not supported');
    }

    return audio;
  }

  // Function to create audio element with OAuth authorization for stream_url
  function createAudioWithAuth(streamUrl, accessToken, owl) {
    var audio = new Audio();

    // Add event listeners
    audio.addEventListener('play', owls.callbacks.play.bind(null, owl), false);
    audio.addEventListener('pause', owls.callbacks.pause.bind(null, owl), false);
    audio.addEventListener('ended', owls.callbacks.pause.bind(null, owl), false);
    audio.addEventListener('error', function(e) {
      owls.callbacks.error(owl, e);
    }, false);

    // Fetch the stream URL with OAuth, which will redirect to the actual audio file
    fetch(streamUrl, {
      headers: {
        'Authorization': 'OAuth ' + accessToken
      }
    })
    .then(function(response) {
      if (!response.ok) {
        throw new Error('Failed to fetch audio: ' + response.status);
      }
      return response.blob();
    })
    .then(function(blob) {
      var blobUrl = URL.createObjectURL(blob);
      audio.src = blobUrl;

      // Clean up blob URL when audio is loaded
      audio.addEventListener('loadeddata', function() {
        // Keep the blob URL for playback
      }, { once: true });
    })
    .catch(function(error) {
      console.error('Error loading audio for ' + owl.title + ':', error);
      owls.callbacks.error(owl, error);
    });

    return audio;
  }

  // Step 1: Get OAuth2 access token
  $.getJSON(tokenEndpoint)
    .done(function(authData) {
      if (!authData.access_token) {
        throw new Error('No access token received');
      }

      var accessToken = authData.access_token;
      console.log('Access token obtained');

      // Step 2: Fetch playlist data with OAuth2 token
      $.ajax({
        url: 'https://api.soundcloud.com/playlists/1362578',
        headers: {
          'Authorization': 'OAuth ' + accessToken
        },
        dataType: 'json',
        success: function(owlsData) {
          if (!owlsData || !owlsData.tracks || owlsData.tracks.length === 0) {
            throw new Error('No tracks found in playlist');
          }

          console.log('Loaded playlist with ' + owlsData.tracks.length + ' tracks');

          // Step 3: Process each track and create audio elements
          var processedTracks = [];
          var errors = [];

          owlsData.tracks.forEach(function(owl, i) {
            try {
              var streamUrl = null;
              var useHLS = false;

              // Try to find HLS transcoding URL (for newer tracks)
              if (owl.media && owl.media.transcodings) {
                var hlsTranscoding = owl.media.transcodings.find(function(t) {
                  return t.format.protocol === 'hls';
                });

                if (hlsTranscoding && hlsTranscoding.url) {
                  streamUrl = hlsTranscoding.url + '?client_id=' + accessToken;
                  useHLS = true;
                }
              }

              // Fall back to stream_url (for older tracks like these owl sounds)
              if (!streamUrl && owl.stream_url) {
                // The stream_url endpoint requires OAuth authorization
                // It will redirect to the actual MP3 file
                streamUrl = owl.stream_url;
                useHLS = false;
              }

              if (!streamUrl) {
                console.error('No streaming URL found for track:', owl.title);
                errors.push(owl.title);
                return;
              }

              // Create audio element
              if (useHLS) {
                owl.audio = createAudioWithHLS(streamUrl, owl);
              } else {
                // For stream_url, we need to use XMLHttpRequest to add OAuth header
                // then create a blob URL for the audio element
                owl.audio = createAudioWithAuth(streamUrl, accessToken, owl);
              }

              owl.index = i + 1;
              owls.data[owl.id] = owl;

              processedTracks.push(owls.render(owl));
            } catch (error) {
              console.error('Error processing track:', owl.title, error);
              errors.push(owl.title);
            }
          });

          // Render all owls
          if (processedTracks.length > 0) {
            $('.keys').html(processedTracks.join(''));
            console.log('Successfully loaded ' + processedTracks.length + ' owl sounds');

            if (errors.length > 0) {
              console.warn('Failed to load ' + errors.length + ' tracks:', errors);
            }
          } else {
            throw new Error('No tracks could be processed');
          }
        },
        error: function(xhr, status, error) {
          console.error('Failed to load playlist:', status, error);
          console.error('Response:', xhr.responseText);

          $('.keys').html(
            '<p style="color: white; text-align: center; padding: 50px; font-size: 18px;">' +
            'Failed to load owl sounds.<br>' +
            '<span style="font-size: 14px;">Please refresh the page or try again later.</span>' +
            '</p>'
          );
        }
      });
    })
    .fail(function(xhr, status, error) {
      console.error('Failed to get access token:', status, error);
      console.error('Response:', xhr.responseText);

      $('.keys').html(
        '<p style="color: white; text-align: center; padding: 50px; font-size: 18px;">' +
        'Authentication failed.<br>' +
        '<span style="font-size: 14px;">Please check the worker configuration and try again.</span>' +
        '</p>'
      );
    });
});

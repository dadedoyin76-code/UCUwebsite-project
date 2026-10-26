/* UCU media loader. Kept separate from the existing gallery JavaScript. */
(() => {
  const container = document.getElementById('ucu-youtube-videos');
  const status = document.getElementById('ucu-media-status');
  if (!container) return;

  const formatDate = value => {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  async function loadVideos() {
    try {
      const response = await fetch('/api/youtube-videos', { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error(`Video feed returned ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.videos) || data.videos.length === 0) {
        throw new Error('No eligible videos were returned.');
      }
      container.replaceChildren();
      data.videos.slice(0, 4).forEach(video => {
        const card = document.createElement('article');
        card.className = 'sermon-card youtube-video-card';
        const frame = document.createElement('iframe');
        frame.className = 'youtube-video-frame';
        frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(video.id)}`;
        frame.title = video.title || 'UCU YouTube video';
        frame.loading = 'lazy';
        frame.allow = 'accelerometer; encrypted-media; gyroscope; picture-in-picture; web-share';
        frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin';
        const details = document.createElement('div');
        details.className = 'youtube-video-details';
        const title = document.createElement('h4');
        title.textContent = video.title || 'UCU video';
        details.appendChild(title);
        const dateText = formatDate(video.publishedAt);
        if (dateText) {
          const time = document.createElement('time');
          time.dateTime = video.publishedAt;
          time.textContent = dateText;
          details.appendChild(time);
        }
        card.append(frame, details);
        container.appendChild(card);
      });
      if (status) status.textContent = 'Latest eligible videos from the UCU YouTube channel. The list refreshes each time this page is opened.';
    } catch (error) {
      container.innerHTML = '<p class="media-error">We could not load the latest videos right now. You can still visit the official UCU YouTube channel using the button below.</p>';
      if (status) status.textContent = 'The live video feed is temporarily unavailable.';
      console.error('UCU YouTube feed:', error);
    }
  }

  loadVideos();
})();

// Vercel serverless endpoint: GET /api/youtube-videos
// Set YOUTUBE_API_KEY in Vercel Project Settings > Environment Variables.
const CHANNEL_ID = 'UC4fxI8JOj7zShpO7sxhyduQ';

function parseDuration(iso) {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '');
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=3600');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: 'YouTube feed is not configured.' });
  try {
    const playlistUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    playlistUrl.search = new URLSearchParams({ part: 'contentDetails', id: CHANNEL_ID, key }).toString();
    const channelResponse = await fetch(playlistUrl);
    if (!channelResponse.ok) throw new Error('Could not retrieve channel uploads playlist.');
    const channelData = await channelResponse.json();
    const uploads = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error('Channel uploads playlist was not found.');

    const playlistUrl2 = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
    playlistUrl2.search = new URLSearchParams({ part: 'snippet,contentDetails', playlistId: uploads, maxResults: '20', key }).toString();
    const playlistResponse = await fetch(playlistUrl2);
    if (!playlistResponse.ok) throw new Error('Could not retrieve recent uploads.');
    const playlistData = await playlistResponse.json();
    const ids = (playlistData.items || []).map(item => item.contentDetails?.videoId).filter(Boolean);
    if (!ids.length) return res.status(200).json({ videos: [] });

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.search = new URLSearchParams({ part: 'contentDetails,snippet', id: ids.join(','), key }).toString();
    const videosResponse = await fetch(videosUrl);
    if (!videosResponse.ok) throw new Error('Could not retrieve video details.');
    const videosData = await videosResponse.json();
    const byId = new Map((videosData.items || []).map(item => [item.id, item]));
    const videos = ids.map(id => byId.get(id)).filter(Boolean)
      // Conservative heuristic: exclude videos 3 minutes or shorter to avoid Shorts.
      // YouTube Data API does not expose a definitive Shorts boolean field.
      .filter(video => parseDuration(video.contentDetails?.duration) > 180)
      .slice(0, 4)
      .map(video => ({
        id: video.id,
        title: video.snippet?.title || 'UCU video',
        publishedAt: video.snippet?.publishedAt || null
      }));
    return res.status(200).json({ videos });
  } catch (error) {
    console.error('YouTube videos API error:', error.message);
    return res.status(502).json({ error: 'Unable to load UCU videos at this time.' });
  }
};

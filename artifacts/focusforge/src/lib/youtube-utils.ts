// Utility functions for YouTube integration
export function extractYouTubeId(url: string): string | null {
  // Handle various YouTube URL formats
  const patterns = [
    // https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    // https://www.youtube.com/embed/VIDEO_ID
    /youtube\.com\/embed\/([^&\n?#]+)/,
    // https://www.youtube.com/v/VIDEO_ID
    /youtube\.com\/v\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

export async function fetchYouTubeMetadata(videoId: string): Promise<{
  title: string;
  thumbnailUrl: string;
} | null> {
  try {
    // Using YouTube's oEmbed API to get metadata
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube metadata');
    }

    const data = await response.json();

    return {
      title: data.title,
      thumbnailUrl: data.thumbnail_url
    };
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    return null;
  }
}